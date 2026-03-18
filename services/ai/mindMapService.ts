import { AIService } from './aiService';

/**
 * Sanitiza o texto de um nó Mermaid removendo toda a pontuação problemática.
 * Mermaid Mindmap v10: não aceita: " ' ( ) [ ] { } / \ : , . ! ? @ # $ % & * + = | < > ^
 */
function sanitizeNodeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[""\"'']/g, '')
    // Permite letras, números, espaços e também: ponto, vírgula, dois pontos e exclamação.
    .replace(/[^\w\sÀ-ÿ.,:!]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Analisa e limpa cada linha do código Mermaid gerado.
 */
function sanitizeMermaidMindmap(raw: string): string {
  let code = raw.replace(/```mermaid\s*/gi, '').replace(/```\s*/g, '').trim();

  if (!code.toLowerCase().startsWith('mindmap')) {
    code = 'mindmap\n' + code;
  }

  const lines = code.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    if (line.trim() === '' || line.trim().toLowerCase() === 'mindmap') {
      cleanedLines.push(line.trim() === '' ? '' : 'mindmap');
      continue;
    }

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const body = line.trim();
    let cleanedLine = '';

    if (body.match(/^root\(\(.*\)\)$/)) {
      const inner = body.slice(6, -2);
      cleanedLine = `root((${sanitizeNodeText(inner)}))`;
    } else if (body.match(/^.*\(\(.*\)\)$/)) {
      const pIdx = body.indexOf('((');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 2, -2);
      cleanedLine = `${sanitizeNodeText(prefix)}((${sanitizeNodeText(inner)}))`;
    } else if (body.match(/^.*\[\[.*\]\]$/)) {
      const pIdx = body.indexOf('[[');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 2, -2);
      cleanedLine = `${sanitizeNodeText(prefix)}[[${sanitizeNodeText(inner)}]]`;
    } else if (body.match(/^.*\[.*\]$/)) {
      const pIdx = body.indexOf('[');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 1, -1);
      cleanedLine = `${sanitizeNodeText(prefix)}[${sanitizeNodeText(inner)}]`;
    } else if (body.match(/^\)\).*\(\($/)) {
      const inner = body.slice(2, -2);
      cleanedLine = `))${sanitizeNodeText(inner)}((`;
    } else if (body.match(/^.*\{\{.*\}\}$/)) {
      const pIdx = body.indexOf('{{');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 2, -2);
      cleanedLine = `${sanitizeNodeText(prefix)}{{${sanitizeNodeText(inner)}}}`;
    } else {
      cleanedLine = sanitizeNodeText(body);
    }

    if (cleanedLine) {
      cleanedLines.push(indent + cleanedLine);
    }
  }

  return cleanedLines.join('\n');
}

/**
 * Extrai contexto clínico completo do paciente para alimentar o mapa mental.
 * Isso garante que o mapa seja clinicamente relevante e específico.
 */
function buildRichClinicalContext(context: any): string {
  const parts: string[] = [];

  // --- DADOS DO PACIENTE ---
  if (context.patient) {
    const p = context.patient;
    parts.push(`PACIENTE: ${p.name || 'N/I'}, ${p.age || '?'} anos, ${p.gender || 'N/I'}`);
    if (p.objective) parts.push(`OBJETIVO CLÍNICO: ${p.objective}`);
    if (p.diagnoses?.length > 0) parts.push(`DIAGNÓSTICOS ATIVOS: ${p.diagnoses.join(', ')}`);
  }

  // --- DADOS ANTROPOMÉTRICOS ---
  if (context.anthropometry?.current) {
    const a = context.anthropometry.current;
    const comp = a.anthro?.bodyComp;
    if (comp) {
      parts.push(`ANTROPOMETRIA ATUAL:`);
      parts.push(`  Peso: ${a.anthro?.weightKg || '?'}kg | Altura: ${a.anthro?.heightM || '?'}m`);
      parts.push(`  IMC: ${comp.bmi?.toFixed(1) || '?'} | Gordura: ${comp.bodyFatPct?.toFixed(1) || '?'}%`);
      parts.push(`  Massa Gorda: ${comp.fatMassKg?.toFixed(1) || '?'}kg | Massa Magra: ${comp.leanMassKg?.toFixed(1) || '?'}kg`);
      if (comp.whr) parts.push(`  RCQ: ${comp.whr.toFixed(2)}`);
      if (comp.whtr) parts.push(`  RCEst: ${comp.whtr.toFixed(2)}`);
      if (comp.picaDiagnosis) parts.push(`  PICA Diagnóstico: ${comp.picaDiagnosis}`);
      if (comp.picaConduct) parts.push(`  PICA Conduta: ${comp.picaConduct}`);
    }
  }

  // --- HISTÓRICO CLÍNICO ---
  if (context.clinical) {
    const c = context.clinical;
    if (c.activeDiagnoses?.length > 0) parts.push(`PATOLOGIAS DE BASE: ${c.activeDiagnoses.join(', ')}`);
    if (c.medications?.length > 0) parts.push(`MEDICAÇÕES: ${c.medications.join(', ')}`);
    if (c.anamnesisSummary) parts.push(`ANAMNESE: ${c.anamnesisSummary.slice(0, 500)}`);
  }

  // --- EXAMES LABORATORIAIS ---
  if (context.exams?.length > 0) {
    const recentExams = context.exams.slice(0, 3); // Últimos 3 exames
    parts.push(`EXAMES LABORATORIAIS RECENTES:`);
    for (const exam of recentExams) {
      if (exam.markers?.length > 0) {
        const alterados = exam.markers.filter((m: any) => m.interpretation !== 'NORMAL');
        const normais = exam.markers.filter((m: any) => m.interpretation === 'NORMAL');
        if (alterados.length > 0) {
          parts.push(`  [${exam.name || exam.date}] ALTERADOS: ${alterados.map((m: any) => `${m.name}: ${m.value}${m.unit} (${m.interpretation})`).join(', ')}`);
        }
        if (normais.length > 0) {
          parts.push(`  [${exam.name || exam.date}] NORMAIS: ${normais.map((m: any) => m.name).join(', ')}`);
        }
      }
    }
  }

  // --- PLANO ALIMENTAR ---
  if (context.plan?.meals?.length > 0) {
    parts.push(`PLANO ALIMENTAR ATIVO:`);
    for (const meal of context.plan.meals) {
      if (meal.items?.length > 0) {
        const items = (meal.items || []).map((it: any) => typeof it === 'string' ? it : (it.customName || it.name)).join(', ');
        parts.push(`  ${meal.name}: ${items}`);
      }
    }
  }

  // --- METAS NUTRICIONAIS ---
  if (context.nutritional?.targets) {
    const t = context.nutritional.targets;
    parts.push(`METAS CALÓRICAS: ${t.kcal}kcal | P: ${t.protein}g | C: ${t.carbs}g | G: ${t.fat}g`);
  }

  // --- PRESCRIÇÕES / SUPLEMENTAÇÃO ---
  if (context.prescriptions?.length > 0) {
    const suplementos = context.prescriptions
      .flatMap((p: any) => p.items || [])
      .filter((it: any) => it.type === 'SUPLEMENTO' || it.type === 'FITOTERÁPICO')
      .map((it: any) => `${it.name} ${it.dose} ${it.frequency}`);
    if (suplementos.length > 0) {
      parts.push(`SUPLEMENTAÇÃO ATIVA: ${suplementos.join(', ')}`);
    }
  }

  // --- ADESÃO ---
  if (context.adherence) {
    parts.push(`ADESÃO: Score ${context.adherence.score || '?'}/100`);
  }

  return parts.join('\n');
}

export const MindMapService = {
  async generatePatientMindMap(
    context: any,
    type: 'CLINICAL' | 'TREATMENT' | 'GOALS' | 'EDUCATION' | 'PHYSIOPATHOLOGY' | 'INTERACTIONS' | 'ALLERGIES' | 'PATHOLOGY' = 'CLINICAL'
  ): Promise<string> {
    console.log(`[AI MindMap] Gerando mapa tipo: ${type}...`);

    const clinicalData = buildRichClinicalContext(context);

    const prompts: Record<string, string> = {
      CLINICAL: `
Gere um mapa mental Mermaid (sintaxe mindmap) que CONTEXTUALIZE O PLANO ALIMENTAR deste paciente de forma clínica e completa.

O mapa deve ter os seguintes ramos obrigatórios a partir do nó central:
1. DIAGNÓSTICO ANTROPOMÉTRICO - IMC, Gordura, Massa Magra.
2. EXAMES ALTERADOS - Marcadores e correlação.
3. PATOLOGIA DE BASE - Diagnósticos e medicações.
4. INTERVENÇÃO PELO PLANO - Estratégia e justificativa.
5. SUPLEMENTAÇÃO - Prescrições e objetivos.
6. PROGNÓSTICO - Resultados esperados com e sem adesão.`,

      TREATMENT: `
Gere um mapa mental Mermaid (sintaxe mindmap) mostrando a cadeia completa de tratamento.
O nó central deve ser o DIAGNÓSTICO PRINCIPAL.
Ramos: Fisiopatologia, Antropometria, Exames, Conduta Nutricional, Suplementação, Objetivos Terapêuticos.`,

      GOALS: `
Gere um mapa mental Mermaid (sintaxe mindmap) de METAS CLÍNICAS do paciente.
O nó central deve ser o OBJETIVO PRINCIPAL.
Ramos: Curto Prazo (1 mês), Médio Prazo (3 meses), Longo Prazo (6 meses), Riscos sem Intervenção.`,

      EDUCATION: `
Gere um mapa mental Mermaid (sintaxe mindmap) de EDUCAÇÃO NUTRICIONAL personalizada.
O nó central deve ser "Educação Nutricional".
Ramos: Justificativa do Plano, Grupos Essenciais, Alimentos a Evitar, Substituições, Combinações Bioativas.`,

      PHYSIOPATHOLOGY: `
Gere um mapa mental Mermaid (sintaxe mindmap) focado na FISIOPATOLOGIA baseada no histórico.
O nó central deve ser "Origem e Evolução Clínica".
Ramos: Gatilhos Históricos, Mecanismo da Doença Atual, Impacto Metabólico, Agravantes (Habitos), Correlação com Exames.`,

      INTERACTIONS: `
Gere um mapa mental Mermaid (sintaxe mindmap) focado em INTERAÇÕES FARMACOLÓGICAS VS DIETA.
O nó central deve ser "Interações Fármaco-Nutriente".
Ramos: Medicações em Uso, Nutrientes Afetados, Alimentos que Potencializam Medicação, Alimentos que Inibem Absorção, Horários Otimizados.`,

      ALLERGIES: `
Gere um mapa mental Mermaid (sintaxe mindmap) focado no MANEJO DE ALERGIAS E INTOLERÂNCIAS.
O nó central deve ser "Gestão de Hipersensibilidades".
Ramos: Alérgenos Identificados, Reações Esperadas, Alimentos Seguros (Substitutos), Cuidados em Rótulos, Estratégia de Recuperação de Barreira Intestinal.`,

      PATHOLOGY: `
Gere um mapa mental Mermaid (sintaxe mindmap) focado nas PATOLOGIAS DE BASE.
O nó central deve ser "Quadro Clínico e Evolução".
Ramos: Diagnósticos Ativos, Sinais e Sintomas Relatados, Complicações Prevenidas, Foco do Tratamento Atual, Monitoramento Necessário.`
    };

    const prompt = `
DADOS CLÍNICOS REAIS DO PACIENTE:
${clinicalData}

TAREFA:
${prompts[type]}

REGRAS ABSOLUTAS DE SINTAXE MERMAID MINDMAP v10 E ESTRUTURA:
1. PRIMEIRA LINHA: "mindmap" sem nada mais.
2. SEGUNDA LINHA: "  root((TEXTO AQUI))" com 2 espaços de indentação.
3. Cada nível filho adiciona mais 2 espaços exatos.
4. PROIBIDO ABSOLUTAMENTE dentro de qualquer texto de nó: aspas simples/duplas ( ' " ), parênteses e chaves que não sejam delimitadores, e símbolos especiais (# $ & * etc).
5. REGRA DA EXPLICAÇÃO (OBRIGATÓRIO): Para CADA ramo principal que sai do nó central, o PRIMEIRO nó filho deve ser OBRIGATORIAMENTE uma "breve explicação", com MAXIMO de 10 palavras, visando o paciente leigo. Esta explicação DEVE estar entre colchetes, por exemplo: [Gordura visceral alta. Foco na redução].
6. MÁXIMO DE 3 NÓS FILHOS (dados/parâmetros) por cada explicação para evitar poluição visual. Os dados devem ter no máximo 4 palavras.
7. Retorne SOMENTE o código mindmap, sem markdown, sem introduções.

EXEMPLO CORRETO DE ESTRUTURA:
mindmap
  root((Controle Metabólico))
    Diagnóstico Antropométrico
      [O paciente apresenta excesso de gordura visceral. O objetivo primário é promover déficit calórico para proteção cardiovascular.]
      IMC 28 Sobrepeso
      Gordura Corporal 32 porcento
      Massa Magra 45kg
    Patologia de Base
      [A resistência à insulina diagnosticada exige controle rigoroso de açúcares. A medicação atual foi ajustada para este fim.]
      Diabetes Tipo 2
      Dislipidemia
    Intervenção Nutricional
      [A dieta foi calculada com leve déficit calórico. Maior consumo de fibras para controle da glicose.]
      Dieta 1800 kcal
      Proteína 120g dia
      Fibras Aumentadas
`;

    try {
      const response = await AIService.ask({
        prompt,
        role: 'professional',
        temperature: 0.2,
        model: 'google/gemini-1.5-flash' // O Proxy redirecionará para o 2.5 Flash ou 2.0 conforme configurado
      });

      const cleanCode = sanitizeMermaidMindmap(response);
      console.log('[MindMap] Código gerado (sanitizado):\n', cleanCode);
      return cleanCode;
    } catch (error) {
      console.error('[MindMap] Erro:', error);
      // Fallback estático mas clinicamente correto
      return `mindmap
  root((Plano Clínico))
    Diagnóstico
      Avaliação Antropométrica
      Exames Laboratoriais
    Conduta Nutricional
      Plano Alimentar Ativo
      Metas Calóricas
    Suplementação
      Conforme Prescrição
    Adesão
      Resultados Esperados
    Sem Adesão
      Riscos Metabólicos`;
    }
  }
};
