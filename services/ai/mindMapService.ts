import { OpenRouterService } from './openRouterService';

/**
 * Sanitiza o texto de um nó Mermaid removendo toda a pontuação problemática.
 * Mermaid Mindmap v10: não aceita: " ' ( ) [ ] { } / \ : , . ! ? @ # $ % & * + = | < > ^
 */
function sanitizeNodeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[""\"'']/g, '')
    .replace(/[^\w\sÀ-ÿ]/g, ' ')
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
    type: 'CLINICAL' | 'TREATMENT' | 'GOALS' | 'EDUCATION' = 'CLINICAL'
  ): Promise<string> {
    console.log(`[AI MindMap] Gerando mapa tipo: ${type}...`);

    const clinicalData = buildRichClinicalContext(context);

    const prompts: Record<string, string> = {
      CLINICAL: `
Gere um mapa mental Mermaid (sintaxe mindmap) que CONTEXTUALIZE O PLANO ALIMENTAR deste paciente de forma clínica e completa.

O mapa deve ter os seguintes ramos obrigatórios a partir do nó central (que deve ser o OBJETIVO DE SAÚDE do paciente):

1. DIAGNÓSTICO ANTROPOMÉTRICO
   - IMC e classificação
   - Percentual de gordura corporal
   - Massa magra e gorda
   - Risco cardiovascular (RCQ e RCEst se disponíveis)
   - Diagnóstico PICA se houver

2. EXAMES ALTERADOS
   - Listar marcadores fora da faixa normal com valores
   - Correlação clínica de cada alteração

3. PATOLOGIA DE BASE
   - Diagnósticos ativos
   - Medicações em uso
   - Impacto na conduta nutricional

4. INTERVENÇÃO PELO PLANO ALIMENTAR
   - Estratégia calórica adotada
   - Distribuição de macros
   - Alimentos chave do plano
   - Justificativa nutricional

5. SUPLEMENTAÇÃO
   - Suplementos prescritos
   - Objetivo de cada suplemento
   - Interação com o plano alimentar

6. ADESÃO E RESULTADOS ESPERADOS
   - Score de adesão atual
   - Metas de curto prazo com adesão
   - Resultados clínicos esperados em 30 60 90 dias

7. ABSTENÇÃO E RESULTADOS ESPERADOS
   - Consequências da não adesão
   - Riscos metabólicos se não seguir
   - Prognóstico sem intervenção

Use os dados reais do paciente para preencher cada ramo. Nunca invente dados.
Se algum dado não estiver disponível, omita o ramo ou escreva "Sem dados".`,

      TREATMENT: `
Gere um mapa mental Mermaid (sintaxe mindmap) mostrando a cadeia completa de tratamento:
O nó central deve ser o DIAGNÓSTICO PRINCIPAL do paciente.

Ramos obrigatórios:
1. FISIOPATOLOGIA — mecanismo da doença e impacto metabólico
2. ANTROPOMETRIA — estado nutricional atual (IMC, gordura, massa magra)
3. EXAMES — marcadores alterados e sua correlação
4. CONDUTA NUTRICIONAL — plano alimentar como intervenção direta
5. SUPLEMENTAÇÃO — o que foi prescrito e por quê
6. OBJETIVO TERAPÊUTICO — metas mensuráveis (peso, gordura, glicemia, etc.)
7. PROGNÓSTICO — com adesão vs sem adesão

Use APENAS dados reais do paciente. Nunca invente valores.`,

      GOALS: `
Gere um mapa mental Mermaid (sintaxe mindmap) de METAS CLÍNICAS do paciente.
O nó central deve ser o OBJETIVO PRINCIPAL do paciente.

Ramos obrigatórios:
1. CURTO PRAZO (1 mês)
   - Meta de peso / gordura
   - Meta de exames
   - Adesão esperada

2. MÉDIO PRAZO (3 meses)
   - Reeducação alimentar consolidada
   - Melhora em marcadores clínicos
   - Avaliação antropométrica esperada

3. LONGO PRAZO (6 meses ou mais)
   - Composição corporal ideal
   - Exames normalizados
   - Autonomia alimentar

4. RISCOS SEM INTERVENÇÃO
   - Degradação metabólica
   - Complicações clínicas

Use APENAS dados reais do paciente para definir metas específicas e mensuráveis.`,

      EDUCATION: `
Gere um mapa mental Mermaid (sintaxe mindmap) de EDUCAÇÃO NUTRICIONAL personalizada.
O nó central deve ser "Educação Nutricional" seguido do nome do paciente.

Ramos obrigatórios:
1. POR QUE ESTE PLANO — Justificativa clínica baseada nos diagnósticos
2. GRUPOS ALIMENTARES ESSENCIAIS — do plano atual
3. ALIMENTOS A EVITAR — Baseado nas patologias e exames
4. SUBSTITUIÇÕES INTELIGENTES — Alternativas do plano
5. COMBINAÇÕES BIOATIVAS — Alimentos que potencializam tratamento
6. HORÁRIOS E ROTINA — Importância da regularidade

Use dados reais do plano e condição clínica do paciente.`
    };

    const prompt = `
DADOS CLÍNICOS REAIS DO PACIENTE:
${clinicalData}

TAREFA:
${prompts[type]}

REGRAS ABSOLUTAS DE SINTAXE MERMAID MINDMAP v10:
1. PRIMEIRA LINHA: "mindmap" sem nada mais.
2. SEGUNDA LINHA: "  root((TEXTO AQUI))" com 2 espaços de indentação.
3. Cada nível filho adiciona mais 2 espaços.
4. PROIBIDO ABSOLUTAMENTE dentro de qualquer texto de nó:
   - Aspas simples ou duplas ( ' " )
   - Parênteses ( ) exceto os delimitadores de nó
   - Colchetes [ ] exceto os delimitadores de nó
   - Chaves { } exceto os delimitadores de nó
   - Dois pontos (:), vírgulas (,), hifens (-), barras (/)
   - Qualquer símbolo especial
5. Use APENAS palavras, números e letras acentuadas nos textos.
6. NÃO escreva mais de 6 palavras por nó.
7. Retorne SOMENTE o código mindmap, sem markdown, sem explicação.

EXEMPLO CORRETO:
mindmap
  root((Controle Metabólico))
    Diagnóstico Antropométrico
      IMC 28 Sobrepeso
      Gordura Corporal 32 porcento
      Massa Magra 45kg
    Exames Alterados
      Glicemia 140 mg dL
      Colesterol Total 240
    Patologia de Base
      Diabetes Tipo 2
      Dislipidemia
    Intervenção Nutricional
      Dieta 1800 kcal
      Proteína 120g dia
      Fibras Aumentadas
    Suplementação
      Ômega 3 EPA DHA
      Cromo Quelato
    Adesão Esperada
      Perda 3kg em 30 dias
      Glicemia Normalizada 90 dias
    Sem Adesão Riscos
      Resistência Insulínica
      Aumento Risco Cardiovascular
`;

    try {
      const response = await OpenRouterService.ask({
        prompt,
        role: 'professional',
        temperature: 0.05
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
