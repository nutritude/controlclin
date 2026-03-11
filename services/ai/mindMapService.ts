import { OpenRouterService } from './openRouterService';

/**
 * Sanitiza o texto de um nó Mermaid removendo toda a pontuação problemática.
 * Mermaid Mindmap v10: não aceita: " ' ( ) [ ] { } / \ : , . ! ? @ # $ % & * + = | < > ^
 */
function sanitizeNodeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/["""'']/g, '')  // aspas tipográficas e retas
    .replace(/[^\w\sÀ-ÿ]/g, ' ')  // mantém letras, números, acentos e espaços
    .replace(/\s{2,}/g, ' ')      // remove espaços duplos
    .trim();
}

/**
 * Analisa e limpa cada linha do código Mermaid gerado.
 */
function sanitizeMermaidMindmap(raw: string): string {
  // 1. Remove blocos de código markdown
  let code = raw.replace(/```mermaid\s*/gi, '').replace(/```\s*/g, '').trim();

  // 2. Garante que começa com "mindmap"
  if (!code.toLowerCase().startsWith('mindmap')) {
    code = 'mindmap\n' + code;
  }

  // 3. Processa linha a linha
  const lines = code.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    if (line.trim() === '' || line.trim().toLowerCase() === 'mindmap') {
      cleanedLines.push(line.trim() === '' ? '' : 'mindmap');
      continue;
    }

    // Captura a indentação (espaços no início)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const body = line.trim();

    // Detecta estruturas de nó do Mermaid mindmap e limpa o conteúdo interno
    // Formatos: root((text)), node[text], node))text((, node{{text}}, plain text
    let cleanedLine = '';

    if (body.match(/^root\(\(.*\)\)$/)) {
      // Central root node: root((Texto))
      const inner = body.slice(6, -2); // remove 'root((' e '))'
      cleanedLine = `root((${sanitizeNodeText(inner)}))`;
    } else if (body.match(/^.*\(\(.*\)\)$/)) {
      // Nó com parênteses duplos
      const pIdx = body.indexOf('((');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 2, -2);
      cleanedLine = `${sanitizeNodeText(prefix)}((${sanitizeNodeText(inner)}))`;
    } else if (body.match(/^.*\[\[.*\]\]$/)) {
      // Nó estilo quadrado duplo
      const pIdx = body.indexOf('[[');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 2, -2);
      cleanedLine = `${sanitizeNodeText(prefix)}[[${sanitizeNodeText(inner)}]]`;
    } else if (body.match(/^.*\[.*\]$/)) {
      // Nó estilo quadrado simples
      const pIdx = body.indexOf('[');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 1, -1);
      cleanedLine = `${sanitizeNodeText(prefix)}[${sanitizeNodeText(inner)}]`;
    } else if (body.match(/^\)\).*\(\($/)) {
      // Nó arredondado: ))text((
      const inner = body.slice(2, -2);
      cleanedLine = `))${sanitizeNodeText(inner)}((`;
    } else if (body.match(/^.*\{\{.*\}\}$/)) {
      // Nó hexágono: {{text}}
      const pIdx = body.indexOf('{{');
      const prefix = body.slice(0, pIdx);
      const inner = body.slice(pIdx + 2, -2);
      cleanedLine = `${sanitizeNodeText(prefix)}{{${sanitizeNodeText(inner)}}}`;
    } else {
      // Texto puro (branch padrão)
      cleanedLine = sanitizeNodeText(body);
    }

    if (cleanedLine) {
      cleanedLines.push(indent + cleanedLine);
    }
  }

  return cleanedLines.join('\n');
}

export const MindMapService = {
  async generatePatientMindMap(
    context: any,
    type: 'CLINICAL' | 'TREATMENT' | 'GOALS' | 'EDUCATION' = 'CLINICAL'
  ): Promise<string> {
    console.log(`[AI MindMap] Gerando mapa tipo: ${type}...`);

    const prompts: Record<string, string> = {
      CLINICAL: `
                Gere um mapa mental Mermaid (sintaxe mindmap) para o plano alimentar do paciente.
                Conecte: DIAGNÓSTICO, EXAMES, CONDUTA NUTRICIONAL e ADESÃO.
                O nó central deve ser o objetivo de saúde do paciente.`,
      TREATMENT: `
                Gere um mapa mental Mermaid (sintaxe mindmap) mostrando a cadeia:
                DIAGNÓSTICO -> MECANISMO -> INTERVENÇÃO NUTRICIONAL -> RESULTADO ESPERADO.`,
      GOALS: `
                Gere um mapa mental Mermaid (sintaxe mindmap) de metas:
                Curto Prazo (1 mês), Médio Prazo (3 meses), Longo Prazo (6 meses+).
                Seja específico com os valores esperados.`,
      EDUCATION: `
                Gere um mapa mental Mermaid (sintaxe mindmap) de educação nutricional:
                Grupos alimentares, substituições inteligentes e combinações bioativas.`
    };

    const prompt = `
CONTEXTO DO PACIENTE:
${JSON.stringify(context, null, 2)}

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
6. NÃO escreva mais de 5 palavras por nó.
7. Retorne SOMENTE o código, sem markdown, sem explicação.

EXEMPLO CORRETO:
mindmap
  root((Controle Metabólico))
    Diagnóstico
      Diabetes Tipo 2
      Sobrepeso
    Conduta
      Redução de Carboidratos
        Priorizar Fibras
        Evitar Açúcar
      Proteína Adequada
        Frango e Ovos
    Metas
      Reduzir Peso 3kg
      Glicemia Normalizada
`;

    try {
      const response = await OpenRouterService.ask({
        prompt,
        role: 'professional',
        temperature: 0.05 // Mínimo para máxima consistência
      });

      const cleanCode = sanitizeMermaidMindmap(response);
      console.log('[MindMap] Código gerado (sanitizado):\n', cleanCode);
      return cleanCode;
    } catch (error) {
      console.error('[MindMap] Erro:', error);
      return `mindmap
  root((Plano Clinico))
    Meta Principal
      Saude Metabolica
    Conduta
      Alimentacao Equilibrada
      Hidratacao Adequada`;
    }
  }
};
