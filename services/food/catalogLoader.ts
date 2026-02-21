/**
 * catalogLoader.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço responsável por parsear os arquivos CSV do catálogo científico de
 * alimentos. Opera exclusivamente sobre strings CSV — sem I/O de arquivos.
 *
 * Regras de parsing:
 *  - Delimitador: vírgula (,)
 *  - Strings entre aspas duplas são tratadas corretamente (RFC 4180)
 *  - Valores numéricos aceitam vírgula como separador decimal (padrão TACO)
 *  - Células vazias, "Tr" (traço) e "1e-05" resultam em undefined/0
 *  - Erros não lançam exceções — são registrados em CatalogLoadResult.errors
 *
 * ATENÇÃO: Este arquivo NÃO importa nem modifica nenhum componente de UI.
 */

import type { FoodRecord, SynonymEntry, PortionRecord, CatalogLoadResult, NutrientDef } from '../../types';

// ─── Utilitários internos ─────────────────────────────────────────────────────

/**
 * Parser CSV simples compatível com RFC 4180.
 * Suporta campos entre aspas com vírgulas e aspas escapadas ("").
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Aspas duplas escapadas dentro de campo
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }

    result.push(current); // Último campo
    return result;
}

/**
 * Converte valor de célula CSV em número.
 * Aceita vírgula decimal (TACO), trata "Tr" (traço), "*", "" e "1e-05" como undefined.
 */
function toNumber(value: string | undefined): number | undefined {
    if (!value || value.trim() === '' || value.trim() === 'Tr' || value.trim() === '*') {
        return undefined;
    }
    const normalized = value.trim().replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return undefined;
    // "1e-05" é essencialmente 0 — preservamos como valor real para manter fidelidade
    return parsed;
}

/**
 * Obtém índice de coluna por nome (case-insensitive + trim).
 */
function colIndex(headers: string[], name: string): number {
    const lower = name.toLowerCase().trim();
    return headers.findIndex(h => h.toLowerCase().trim() === lower);
}


// ─── PASSO 1: Parser do MASTER CSV ───────────────────────────────────────────

const MASTER_REQUIRED_COLS = ['uid', 'nome_canonico', 'energia_kcal_100g'];

/**
 * Parseia o conteúdo do arquivo MASTER_ALIMENTOS_UID_DEDUP_PTBR.csv.
 *
 * @param csvContent - String completa do conteúdo CSV
 * @returns Registros parseados e relatório de resultado
 */
export function parseMasterCSV(csvContent: string): {
    records: FoodRecord[];
    result: CatalogLoadResult;
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const records: FoodRecord[] = [];

    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) {
        return {
            records: [],
            result: { success: false, recordCount: 0, errors: ['Arquivo vazio ou sem dados.'], warnings },
        };
    }

    // Parsear cabeçalho
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    // Validar colunas obrigatórias
    for (const required of MASTER_REQUIRED_COLS) {
        if (colIndex(headers, required) === -1) {
            errors.push(`Coluna obrigatória ausente: "${required}"`);
        }
    }

    if (errors.length > 0) {
        return { records: [], result: { success: false, recordCount: 0, errors, warnings } };
    }

    // Índices das colunas principais
    const idx = {
        uid: colIndex(headers, 'uid'),
        nome: colIndex(headers, 'nome_canonico'),
        kcal: colIndex(headers, 'energia_kcal_100g'),
        proteina: colIndex(headers, 'proteina_g_100g'),
        carboidratos: colIndex(headers, 'carboidratos_g_100g'),
        lipidios: colIndex(headers, 'lipidios_g_100g'),
        fibra: colIndex(headers, 'fibra_alimentar_g_100g'),
        sodio: colIndex(headers, 'sodio_mg_100g'),
        calcio: colIndex(headers, 'calcio_mg_100g'),
        ferro: colIndex(headers, 'ferro_mg_100g'),
        potassio: colIndex(headers, 'potassio_mg_100g'),
        vitamina_c: colIndex(headers, 'vitamina_c_mg_100g'),
        grupo: colIndex(headers, 'grupo'),
        subgrupo: colIndex(headers, 'subgrupo'),
        preparo: colIndex(headers, 'preparo_detectado'),
        fonte: colIndex(headers, '__fonte'),
        prio: colIndex(headers, '__prio'),
    };

    // Parsear linhas de dados
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        const lineNum = i + 1;

        const uid = cells[idx.uid]?.trim();
        const nome = cells[idx.nome]?.trim();
        const kcalRaw = cells[idx.kcal]?.trim();

        if (!uid) {
            warnings.push(`Linha ${lineNum}: uid vazio — ignorada.`);
            continue;
        }
        if (!nome) {
            warnings.push(`Linha ${lineNum}: nome_canonico vazio para uid="${uid}" — ignorada.`);
            continue;
        }

        const kcal = toNumber(kcalRaw);
        if (kcal === undefined) {
            warnings.push(`Linha ${lineNum}: energia_kcal_100g inválido ("${kcalRaw}") para uid="${uid}" — usando 0.`);
        }

        const record: FoodRecord = {
            uid,
            nome,
            kcal: kcal ?? 0,
            proteina_g: toNumber(cells[idx.proteina]),
            carboidratos_g: toNumber(cells[idx.carboidratos]),
            lipidios_g: toNumber(cells[idx.lipidios]),
            fibra_alimentar_g: toNumber(cells[idx.fibra]),
            sodio_mg: toNumber(cells[idx.sodio]),
            calcio_mg: toNumber(cells[idx.calcio]),
            ferro_mg: toNumber(cells[idx.ferro]),
            potassio_mg: toNumber(cells[idx.potassio]),
            vitamina_c_mg: toNumber(cells[idx.vitamina_c]),
            grupo: idx.grupo !== -1 ? (cells[idx.grupo]?.trim() || undefined) : undefined,
            subgrupo: idx.subgrupo !== -1 ? (cells[idx.subgrupo]?.trim() || undefined) : undefined,
            preparo: idx.preparo !== -1 ? (cells[idx.preparo]?.trim() || undefined) : undefined,
            fonte: idx.fonte !== -1 ? (cells[idx.fonte]?.trim() || undefined) : undefined,
            prio: idx.prio !== -1 ? toNumber(cells[idx.prio]) : undefined,
        };

        records.push(record);
    }

    return {
        records,
        result: {
            success: errors.length === 0,
            recordCount: records.length,
            errors,
            warnings,
        },
    };
}


// ─── PASSO 2: Parser do dicionário de sinônimos ───────────────────────────────

/**
 * Colunas obrigatórias no DICIONARIO_SINONIMOS_ALIMENTOS_UID.csv.
 * Colunas de termos são opcionais — pelo menos uma deve estar presente.
 */
const SYNONYM_REQUIRED_COLS = ['uid'];

/**
 * Colunas que geram termos de busca (em ordem de prioridade).
 * Cada coluna presente gera um SynonymEntry separado por linha.
 */
const SYNONYM_TERM_COLS = [
    'nome_canonico',    // Nome principal PT-BR
    'nome_original',    // Nome na língua original da base
    'chave_strict',     // Versão sem acentos/pontuação
    'chave_loose',      // Versão mais simplificada (melhor cobertura fuzzy)
] as const;

/**
 * Parseia o conteúdo do arquivo DICIONARIO_SINONIMOS_ALIMENTOS_UID.csv.
 *
 * Estratégia: cada linha gera múltiplos SynonymEntry (um por coluna de termo
 * não-vazia). Termos são normalizados para lowercase + trim.
 * Colunas usadas: uid, nome_canonico, nome_original, chave_strict, chave_loose.
 *
 * @param csvContent - String completa do conteúdo CSV
 * @returns Entradas parseadas e relatório de resultado
 */
export function parseSynonymCSV(csvContent: string): {
    entries: SynonymEntry[];
    result: CatalogLoadResult;
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const entries: SynonymEntry[] = [];

    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) {
        return {
            entries: [],
            result: { success: false, recordCount: 0, errors: ['Arquivo vazio ou sem dados.'], warnings },
        };
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    for (const required of SYNONYM_REQUIRED_COLS) {
        if (colIndex(headers, required) === -1) {
            errors.push(`Coluna obrigatória ausente: "${required}"`);
        }
    }

    if (errors.length > 0) {
        return { entries: [], result: { success: false, recordCount: 0, errors, warnings } };
    }

    const idxUid = colIndex(headers, 'uid');

    // Mapear índices das colunas de termos disponíveis no CSV
    const termColIndices: Array<{ col: string; idx: number }> = SYNONYM_TERM_COLS
        .map(col => ({ col, idx: colIndex(headers, col) }))
        .filter(({ idx }) => idx !== -1);

    if (termColIndices.length === 0) {
        errors.push(
            `Nenhuma coluna de termos encontrada. Esperado ao menos uma de: ${SYNONYM_TERM_COLS.join(', ')}`
        );
        return { entries: [], result: { success: false, recordCount: 0, errors, warnings } };
    }

    // Conjunto para evitar duplicatas exatas (termo + uid)
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        const lineNum = i + 1;

        const uid = cells[idxUid]?.trim();
        if (!uid) {
            warnings.push(`Linha ${lineNum}: uid vazio — ignorada.`);
            continue;
        }

        let termsAdded = 0;

        for (const { idx } of termColIndices) {
            const raw = cells[idx]?.trim();
            if (!raw) continue;

            const termo = raw.toLowerCase();
            const key = `${termo}|${uid}`;
            if (seen.has(key)) continue;

            seen.add(key);
            entries.push({ termo, uid });
            termsAdded++;
        }

        if (termsAdded === 0) {
            warnings.push(`Linha ${lineNum}: nenhum termo válido para uid="${uid}" — ignorada.`);
        }
    }

    return {
        entries,
        result: {
            success: errors.length === 0,
            recordCount: entries.length,
            errors,
            warnings,
        },
    };
}



// ─── PASSO 3: Parser de porções ───────────────────────────────────────────────

const PORTION_REQUIRED_COLS = ['uid', 'label', 'grams'];

/**
 * Parseia o conteúdo do arquivo de porções (PASSO 3).
 *
 * @param csvContent - String completa do conteúdo CSV
 * @returns Porções parseadas e relatório de resultado
 */
export function parsePortionCSV(csvContent: string): {
    portions: PortionRecord[];
    result: CatalogLoadResult;
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const portions: PortionRecord[] = [];

    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) {
        return {
            portions: [],
            result: { success: false, recordCount: 0, errors: ['Arquivo vazio ou sem dados.'], warnings },
        };
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    for (const required of PORTION_REQUIRED_COLS) {
        if (colIndex(headers, required) === -1) {
            errors.push(`Coluna obrigatória ausente: "${required}"`);
        }
    }

    if (errors.length > 0) {
        return { portions: [], result: { success: false, recordCount: 0, errors, warnings } };
    }

    const idxUid = colIndex(headers, 'uid');
    const idxLabel = colIndex(headers, 'label');
    const idxGrams = colIndex(headers, 'grams');

    for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        const lineNum = i + 1;

        const uid = cells[idxUid]?.trim();
        const label = cells[idxLabel]?.trim();
        const grams = toNumber(cells[idxGrams]);

        if (!uid || !label) {
            warnings.push(`Linha ${lineNum}: uid ou label vazio — ignorada.`);
            continue;
        }
        if (grams === undefined || grams <= 0) {
            warnings.push(`Linha ${lineNum}: grams inválido para uid="${uid}" — ignorada.`);
            continue;
        }

        portions.push({ uid, label, grams });
    }

    return {
        portions,
        result: {
            success: errors.length === 0,
            recordCount: portions.length,
            errors,
            warnings,
        },
    };
}


// ─── PASSO 4: Parser do dicionário de nutrientes ────────────────────────────

const NUTRIENT_REQUIRED_COLS = ['campo_padronizado', 'unidade'];

/**
 * Parseia o conteúdo do arquivo DICIONARIO_NUTRIENTES_PADRONIZADOS.csv.
 *
 * @param csvContent - String completa do conteúdo CSV
 * @returns Definições parseadas e relatório de resultado
 */
export function parseNutrientCSV(csvContent: string): {
    defs: NutrientDef[];
    result: CatalogLoadResult;
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const defs: NutrientDef[] = [];

    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) {
        return {
            defs: [],
            result: { success: false, recordCount: 0, errors: ['Arquivo vazio ou sem dados.'], warnings },
        };
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    for (const required of NUTRIENT_REQUIRED_COLS) {
        if (colIndex(headers, required) === -1) {
            errors.push(`Coluna obrigatória ausente: "${required}"`);
        }
    }

    if (errors.length > 0) {
        return { defs: [], result: { success: false, recordCount: 0, errors, warnings } };
    }

    const idxCampo = colIndex(headers, 'campo_padronizado');
    const idxUnidade = colIndex(headers, 'unidade');

    for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        const lineNum = i + 1;

        const campo = cells[idxCampo]?.trim();
        const unidade = cells[idxUnidade]?.trim();

        if (!campo || !unidade) {
            warnings.push(`Linha ${lineNum}: campo ou unidade vazio — ignorada.`);
            continue;
        }

        defs.push({ campo, unidade });
    }

    return {
        defs,
        result: {
            success: errors.length === 0,
            recordCount: defs.length,
            errors,
            warnings,
        },
    };
}
