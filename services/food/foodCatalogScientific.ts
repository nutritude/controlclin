/**
 * foodCatalogScientific.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Catálogo científico de alimentos baseado em CSV.
 * Carregamento progressivo em 3 passos independentes:
 *   PASSO 1 → initMasterCatalog()   → foodsByUID
 *   PASSO 2 → initSynonymIndex()    → synonymIndex
 *   PASSO 3 → initPortionIndex()    → portionIndex
 *
 * IMPORTANTE:
 * - Este arquivo NÃO importa nenhum componente de UI.
 * - Não altera o foodCatalog.ts existente (mock data).
 * - Não depende de Firebase, db.ts ou qualquer serviço de paciente.
 *
 * Uso típico:
 *   import { ScientificCatalog } from './foodCatalogScientific';
 *   ScientificCatalog.initMasterCatalog(records);
 *   ScientificCatalog.search('frango');
 */

import type { FoodRecord, SynonymEntry, PortionRecord, NutrientDef } from '../../types';
import type { FoodItemCanonical } from './foodCatalog';

// ─── Estado interno (módulo singleton) ───────────────────────────────────────

/** Mapa principal: uid → FoodRecord */
const foodsByUID = new Map<string, FoodRecord>();

/** Índice de sinônimos: termo_normalizado → uid */
const synonymIndex = new Map<string, string>();

/** Índice de porções: uid → PortionRecord[] */
const portionIndex = new Map<string, PortionRecord[]>();

/** Dicionário de nutrientes: campo → unidade */
const nutrientsMap = new Map<string, string>();

/** Flags de estado do catálogo */
const catalogStatus = {
    masterLoaded: false,
    synonymsLoaded: false,
    portionsLoaded: false,
    nutrientsLoaded: false,
    masterCount: 0,
    synonymCount: 0,
    portionCount: 0,
    nutrientsCount: 0,
};


// ─── PASSO 1: Inicialização do catálogo master ────────────────────────────────

/**
 * Inicializa o catálogo a partir dos registros do MASTER CSV.
 * Sobrescreve qualquer estado anterior.
 *
 * @param records - Array de FoodRecord parseados pelo catalogLoader
 */
function initMasterCatalog(records: FoodRecord[]): void {
    foodsByUID.clear();

    for (const record of records) {
        if (!record.uid || !record.nome) continue;
        foodsByUID.set(record.uid, record);

        // Indexar automaticamente o nome canônico como sinônimo imediato
        const nomeNorm = record.nome.toLowerCase().trim();
        if (nomeNorm && !synonymIndex.has(nomeNorm)) {
            synonymIndex.set(nomeNorm, record.uid);
        }
    }

    catalogStatus.masterLoaded = true;
    catalogStatus.masterCount = foodsByUID.size;

    console.info(
        `[ScientificCatalog] MASTER carregado: ${foodsByUID.size} alimentos indexados.`
    );
}


// ─── PASSO 2: Inicialização do índice de sinônimos ────────────────────────────

/**
 * Inicializa o índice de sinônimos a partir das entradas do dicionário CSV.
 * Requer que o master já tenha sido carregado (verifica e avisa se não).
 *
 * @param entries - Array de SynonymEntry parseados pelo catalogLoader
 */
function initSynonymIndex(entries: SynonymEntry[]): void {
    if (!catalogStatus.masterLoaded) {
        console.warn(
            '[ScientificCatalog] initSynonymIndex() chamado antes do master. ' +
            'Os sinônimos serão carregados, mas buscas por UID podem falhar ' +
            'se o master não for carregado depois.'
        );
    }

    let added = 0;
    let skipped = 0;

    for (const entry of entries) {
        const termo = entry.termo?.toLowerCase().trim();
        const uid = entry.uid?.trim();

        if (!termo || !uid) {
            skipped++;
            continue;
        }

        // Não sobrescreve se já existir (prioridade: nome canônico > sinônimos)
        if (!synonymIndex.has(termo)) {
            synonymIndex.set(termo, uid);
            added++;
        }
    }

    catalogStatus.synonymsLoaded = true;
    catalogStatus.synonymCount = synonymIndex.size;

    console.info(
        `[ScientificCatalog] SINÔNIMOS carregados: ${added} adicionados, ` +
        `${skipped} ignorados. Total no índice: ${synonymIndex.size}.`
    );
}


// ─── PASSO 3: Inicialização do índice de porções ─────────────────────────────

/**
 * Inicializa o índice de porções por UID.
 *
 * @param portions - Array de PortionRecord parseados pelo catalogLoader
 */
function initPortionIndex(portions: PortionRecord[]): void {
    portionIndex.clear();

    for (const portion of portions) {
        const uid = portion.uid?.trim();
        if (!uid) continue;

        const existing = portionIndex.get(uid) ?? [];
        existing.push(portion);
        portionIndex.set(uid, existing);
    }

    catalogStatus.portionsLoaded = true;
    catalogStatus.portionCount = portionIndex.size;

    console.info(
        `[ScientificCatalog] PORÇÕES carregadas: ${portions.length} entradas ` +
        `para ${portionIndex.size} alimentos.`
    );
}


// ─── PASSO 4: Inicialização do dicionário de nutrientes ──────────────────────

/**
 * Inicializa o dicionário de nutrientes (campo -> unidade).
 *
 * @param defs - Array de NutrientDef parseados pelo catalogLoader
 */
function initNutrientDictionary(defs: NutrientDef[]): void {
    nutrientsMap.clear();

    for (const def of defs) {
        if (!def.campo || !def.unidade) continue;
        nutrientsMap.set(def.campo, def.unidade);
    }

    catalogStatus.nutrientsLoaded = true;
    catalogStatus.nutrientsCount = nutrientsMap.size;

    console.info(
        `[ScientificCatalog] NUTRIENTES carregados: ${nutrientsMap.size} definições.`
    );
}


// ─── API de consulta ──────────────────────────────────────────────────────────

/**
 * Busca alimento diretamente pelo UID.
 *
 * @param uid - UUID do alimento
 * @returns FoodRecord ou undefined se não encontrado
 */
function getByUID(uid: string): FoodRecord | undefined {
    return foodsByUID.get(uid.trim());
}

/**
 * Busca alimentos por nome ou sinônimo.
 * Estratégia em 3 camadas:
 *   1. Match exato no synonymIndex (retorna 1 resultado imediato)
 *   2. Match parcial nos nomes canônicos (busca no Map inteiro)
 *   3. Match parcial nos termos do synonymIndex (cobre abreviações)
 *
 * @param query - Texto de busca (normalizado internamente)
 * @param limit - Máximo de resultados (default: 20)
 * @returns Array de FoodRecord ordenados por relevância
 */
function searchByName(query: string, limit = 20): FoodRecord[] {
    if (!query || !catalogStatus.masterLoaded) return [];

    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results = new Map<string, FoodRecord>(); // uid → record (evita duplicatas)

    // 1. Match exato no índice de sinônimos
    const exactUID = synonymIndex.get(q);
    if (exactUID) {
        const exactRecord = foodsByUID.get(exactUID);
        if (exactRecord) {
            results.set(exactUID, exactRecord);
        }
    }

    if (results.size >= limit) {
        return Array.from(results.values()).slice(0, limit);
    }

    // 2. Match parcial nos nomes canônicos
    for (const [uid, record] of foodsByUID) {
        if (results.size >= limit) break;
        if (results.has(uid)) continue;
        if (record.nome.toLowerCase().includes(q)) {
            results.set(uid, record);
        }
    }

    if (results.size >= limit) {
        return Array.from(results.values()).slice(0, limit);
    }

    // 3. Match parcial nos sinônimos → recupera o FoodRecord correspondente
    for (const [termo, uid] of synonymIndex) {
        if (results.size >= limit) break;
        if (results.has(uid)) continue;
        if (termo.includes(q)) {
            const record = foodsByUID.get(uid);
            if (record) results.set(uid, record);
        }
    }

    return Array.from(results.values()).slice(0, limit);
}

/**
 * Busca alimentos por categoria.
 *
 * @param category - Nome da categoria
 * @param limit - Máximo de resultados
 */
function searchByCategory(category: string, limit = 50): FoodRecord[] {
    if (!category || !catalogStatus.masterLoaded) return [];

    const cat = category.toLowerCase().trim();
    const results: FoodRecord[] = [];

    for (const record of foodsByUID.values()) {
        if (results.length >= limit) break;
        if ((record.grupo || '').toLowerCase().includes(cat)) {
            results.push(record);
        }
    }

    return results;
}

/**
 * Retorna as porções cadastradas para um alimento.
 *
 * @param uid - UUID do alimento
 * @returns Array de PortionRecord (vazio se PASSO 3 não foi carregado)
 */
function getPortions(uid: string): PortionRecord[] {
    return portionIndex.get(uid.trim()) ?? [];
}

/**
 * Retorna o status atual do catálogo científico.
 * Útil para diagnóstico via console do browser:
 *   ScientificCatalog.getStatus()
 */
function getStatus() {
    return { ...catalogStatus };
}

/**
 * Retorna a unidade de um nutriente.
 *
 * @param campo - Nome do campo
 */
function getNutrientUnit(campo: string): string | undefined {
    return nutrientsMap.get(campo);
}

/**
 * Retorna todos os alimentos do catálogo (útil para listas completas).
 * Use com cuidado — pode ser grande (>5k itens).
 *
 * @param limit - Máximo de itens (default: 100)
 */
function getAll(limit = 100): FoodRecord[] {
    return Array.from(foodsByUID.values()).slice(0, limit);
}

/**
 * Mapeia porções inteligentes (Smart Portions) baseadas em referências técnicas (Anvisa/TBCA/TACO)
 * como fallback ou complemento ao catálogo.
 */
function getSmartPortions(record: FoodRecord): PortionRecord[] {
    const portions: PortionRecord[] = [];
    const grupo = (record.grupo || '').toLowerCase();
    const nome = record.nome.toLowerCase();

    // 1. LÍQUIDOS (Leites, Sucos, Bebidas, Café, Chá, Água)
    const isQueijo = nome.includes('queijo') || nome.includes('mussarela') || nome.includes('ricota') || nome.includes('parmesão');

    const eLiquido = (grupo.includes('leite') || grupo.includes('bebida') || grupo.includes('suco') ||
        nome.includes('suco') || nome.includes('leite') || nome.includes('café') ||
        nome.includes('chá') || nome.includes('água') || nome.includes('refrigerante') ||
        nome.includes('iogurte líquido')) && !isQueijo;

    if (eLiquido) {
        portions.push({ uid: record.uid, label: 'Copo (200ml)', grams: 200 });
        portions.push({ uid: record.uid, label: 'Xícara (240ml)', grams: 240 });
        portions.push({ uid: record.uid, label: 'Colher de sopa (15ml)', grams: 15 });
    }
    // 1.5 QUEIJOS (Laticínios Sólidos)
    else if (isQueijo) {
        portions.push({ uid: record.uid, label: 'Fatia média (30g)', grams: 30 });
        portions.push({ uid: record.uid, label: 'Fatia fina (15g)', grams: 15 });
        portions.push({ uid: record.uid, label: 'Colher de sopa (20g)', grams: 20 });
    }
    // 2. PÃES E CEREAIS (Pão, Torrada, Biscoito)
    else if (grupo.includes('pães') || nome.includes('pão') || nome.includes('torrada') || nome.includes('biscoito')) {
        if (nome.includes('forma') || nome.includes('integral') || nome.includes('torrada')) {
            portions.push({ uid: record.uid, label: 'Fatia (25g)', grams: 25 });
        } else {
            portions.push({ uid: record.uid, label: 'Unidade (50g)', grams: 50 });
            portions.push({ uid: record.uid, label: 'Fatia (30g)', grams: 30 });
        }
    }
    // 3. LEGUMINOSAS (Feijões, Lentilhas, Grão de bico)
    else if (grupo.includes('leguminosas') || nome.includes('feijão') || nome.includes('lentilha')) {
        portions.push({ uid: record.uid, label: 'Concha média (130g)', grams: 130 });
        portions.push({ uid: record.uid, label: 'Colher de sopa (20g)', grams: 20 });
    }
    // 4. ARROZ E MASSAS
    else if (nome.includes('arroz') || nome.includes('macarrão') || nome.includes('massa') || nome.includes('cuscuz')) {
        portions.push({ uid: record.uid, label: 'Colher de servir (45g)', grams: 45 });
        portions.push({ uid: record.uid, label: 'Escumadeira (150g)', grams: 150 });
        portions.push({ uid: record.uid, label: 'Colher de sopa (25g)', grams: 25 });
    }
    // 5. FRUTAS
    else if (grupo.includes('frutas')) {
        portions.push({ uid: record.uid, label: 'Unidade pequena (80g)', grams: 80 });
        portions.push({ uid: record.uid, label: 'Unidade média (120g)', grams: 120 });
        portions.push({ uid: record.uid, label: 'Fatia média (100g)', grams: 100 });
    }
    // 6. CARNES
    else if (grupo.includes('carnes') || grupo.includes('aves') || grupo.includes('peixes')) {
        portions.push({ uid: record.uid, label: 'Bife médio (100g)', grams: 100 });
        portions.push({ uid: record.uid, label: 'Filé pequeno (80g)', grams: 80 });
        portions.push({ uid: record.uid, label: 'Colher de sopa picado (25g)', grams: 25 });
    }
    // 7. GORDURAS E ÓLEOS
    else if (grupo.includes('óleos') || grupo.includes('gorduras') || nome.includes('azeite') || nome.includes('manteiga') || nome.includes('margarina')) {
        portions.push({ uid: record.uid, label: 'Colher de sopa (10g)', grams: 10 });
        portions.push({ uid: record.uid, label: 'Colher de chá (4g)', grams: 4 });
        portions.push({ uid: record.uid, label: 'Fio (só azeite) (5ml)', grams: 5 });
    }
    // 8. OLEAGINOSAS (Castanhas, Nozes)
    else if (grupo.includes('oleaginosas') || nome.includes('castanha') || nome.includes('nozes') || nome.includes('amêndoa')) {
        portions.push({ uid: record.uid, label: 'Unidade (5g)', grams: 5 });
        portions.push({ uid: record.uid, label: 'Colher de sopa (15g)', grams: 15 });
        portions.push({ uid: record.uid, label: 'Punhado (30g)', grams: 30 });
    }
    // 9. OVOS (Ovos, Claras, Gemas)
    else if (nome.includes('ovo') || nome.includes('clara') || nome.includes('gema')) {
        if (nome.includes('clara')) {
            portions.push({ uid: record.uid, label: 'Unidade (35g)', grams: 35 });
        } else if (nome.includes('gema')) {
            portions.push({ uid: record.uid, label: 'Unidade (15g)', grams: 15 });
        } else {
            portions.push({ uid: record.uid, label: 'Unidade (50g)', grams: 50 });
        }
    }
    // 10. BOLOS
    else if (nome.includes('bolo') || grupo.includes('panificação')) {
        if (nome.includes('bolo')) {
            portions.push({ uid: record.uid, label: 'Fatia média (60g)', grams: 60 });
            portions.push({ uid: record.uid, label: 'Pedaço P (40g)', grams: 40 });
            portions.push({ uid: record.uid, label: 'Pedaço M (80g)', grams: 80 });
            portions.push({ uid: record.uid, label: 'Pedaço G (120g)', grams: 120 });
        }
    }
    // 11. SEMENTES E FARINHAS
    else if (nome.includes('semente') || nome.includes('farinha') || nome.includes('farelo') || nome.includes('germe') ||
        nome.includes('chia') || nome.includes('linhaça') || nome.includes('gergelim') || nome.includes('aveia')) {
        portions.push({ uid: record.uid, label: 'Colher de sopa (15g)', grams: 15 });
        portions.push({ uid: record.uid, label: 'Colher de sobremesa (7g)', grams: 7 });
        portions.push({ uid: record.uid, label: 'Colher de chá (3g)', grams: 3 });
    }

    // 12. SUPLEMENTOS
    else if (grupo.includes('suplementos') || grupo.includes('suplemento') ||
        nome.includes('whey') || nome.includes('creatina') || nome.includes('bcaa') ||
        nome.includes('albumina') || nome.includes('colágeno') || nome.includes('maltodextrina') ||
        nome.includes('proteína') || nome.includes('pré-treino') || nome.includes('caseína')) {
        portions.push({ uid: record.uid, label: 'Scoop (30g)', grams: 30 });
        portions.push({ uid: record.uid, label: 'Scoop duplo (60g)', grams: 60 });
        portions.push({ uid: record.uid, label: 'Colher de sopa (10g)', grams: 10 });
        portions.push({ uid: record.uid, label: 'Sachê (25g)', grams: 25 });
    }

    return portions;
}

/**
 * Limpa todo o estado do catálogo (útil para testes).
 */
function reset(): void {
    foodsByUID.clear();
    synonymIndex.clear();
    portionIndex.clear();
    catalogStatus.masterLoaded = false;
    catalogStatus.synonymsLoaded = false;
    catalogStatus.portionsLoaded = false;
    catalogStatus.masterCount = 0;
    catalogStatus.synonymCount = 0;
    catalogStatus.portionCount = 0;
    console.info('[ScientificCatalog] Catálogo resetado.');
}


/**
 * Converte um FoodRecord (Científico) para FoodItemCanonical (UI).
 */
function recordToCanonical(record: FoodRecord): FoodItemCanonical {
    const csvPortions = getPortions(record.uid);
    const smartPortions = getSmartPortions(record);

    // Mesclar porções (Deduplicando por label)
    const portionMap = new Map<string, { label: string, grams: number }>();

    // 1. Adicionar smart portions como base
    smartPortions.forEach(p => portionMap.set(p.label, { label: p.label, grams: p.grams }));

    // 2. CSV portions sobrescrevem/complementam
    csvPortions.forEach(p => portionMap.set(p.label, { label: p.label, grams: p.grams }));

    const formattedPortions = Array.from(portionMap.values());

    return {
        id: record.uid,
        namePt: record.nome,
        category: record.grupo || 'Geral',
        nutrientsPer100g: {
            kcal: record.kcal,
            protein_g: record.proteina_g || 0,
            carb_g: record.carboidratos_g || 0,
            fat_g: record.lipidios_g || 0,
            fiber_g: record.fibra_alimentar_g,
            sodium_mg: record.sodio_mg,
            calcium_mg: record.calcio_mg,
            iron_mg: record.ferro_mg,
            potassium_mg: record.potassio_mg,
            vitaminC_mg: record.vitamina_c_mg,
        },
        portions: formattedPortions.length > 0 ? formattedPortions : [
            { label: '100g (Padrão)', grams: 100 }
        ]
    };
}

// ─── Exportações ──────────────────────────────────────────────────────────────

export const ScientificCatalog = {
    // Inicialização (por passo)
    initMasterCatalog,
    initSynonymIndex,
    initPortionIndex,
    initNutrientDictionary,

    // Consultas
    getByUID,
    searchByName,
    searchByCategory,
    getPortions,
    getNutrientUnit,
    recordToCanonical,

    // Diagnóstico
    getStatus,
    getAll,
    reset,
} as const;

// Tipos re-exportados para conveniência
export type { FoodRecord, SynonymEntry, PortionRecord } from '../../types';
export type { FoodItemCanonical } from './foodCatalog';
