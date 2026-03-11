import { OpenRouterService } from './openRouterService';

export const MindMapService = {
  /**
   * Gera o código Mermaid para um mapa mental baseado no contexto do paciente.
   * Foco: Objetivo, Científico e Comportamental.
   */
  async generatePatientMindMap(context: any, type: 'CLINICAL' | 'TREATMENT' | 'GOALS' | 'EDUCATION' = 'CLINICAL'): Promise<string> {
    console.log(`[AI MindMap] Gerando mapa mental do tipo: ${type}...`);

    const typeInstructions = {
      CLINICAL: `
                FOCO: Conexão entre Perfil comportamental psicológico (MIPAN), Exames, Patologias e Diagnóstico Antropométrico.
                CONTEÚDO OBRIGATÓRIO:
                - Perfil comportamental psicológico (MIPAN)
                - Conduta clínica baseada em evidências
                - Contexto das escolhas dos alimentos (por que este alimento e não outro?)
                - Relação das refeições com a rotina do paciente
                - Efeito metabólico esperado (ex: melhora sensib. insulina, saciedade)
                - Efeito caso não haja adesão (riscos clínicos reais)`,
      TREATMENT: `
                FOCO: Conectar "Diagnóstico" → "Fisiopatologia" → "Conduta Nutricional".
                Deve explicar COMO o alimento atua no problema de saúde.`,
      GOALS: `
                FOCO: Estratégia de Metas de Curto, Médio e Longo Prazo.
                Visualizar a escada do sucesso do paciente.`,
      EDUCATION: `
                FOCO: Educação Nutricional.
                Combinações inteligentes de alimentos ou substituições de alto valor biológico.`
    };

    const prompt = `
            Você é um Cientista de Dados e Nutricionista Clínico sênior especializado em Medicina de Precisão.
            Crie um mapa mental no formato Mermaid (sintaxe mindmap) extremamente OBJETIVO e CIENTÍFICO.

            TIPO DE MAPA: ${type}
            ${typeInstructions[type]}

            CONTEXTO DO PACIENTE:
            ${JSON.stringify(context)}

            REGRAS TÉCNICAS MERMAID:
            1. Use a sintaxe Mermaid MINDMAP (começa com 'mindmap').
            2. Use formas variadas: root((Central)), node[Retângulo], node))Orelha((, node{{Hexágono}}.
            3. Use o nó central para o conceito chave (ex: "Estratégia Metabólica" ou "Jornada de ${context.patient?.name}").
            4. NÃO use aspas duplas, hifens sozinhos em ramos ou qualquer caractere que quebre o Mermaid.
            5. Retorne APENAS o código purista do diagrama.

            EXEMPLO DE ESTRUTURA METABÓLICA:
            mindmap
              root((Estratégia Metabólica))
                Conduta::Foco Anti-inflamatório
                  Ação[Aumento de Ômega 3]
                    Alimento))Sardinha e Chia((
                    Efeito-Redução PCR
                Risco::Não Adesão
                  Consequência{{Aumento Fadiga Crônica}}
        `;

    try {
      const response = await OpenRouterService.ask({
        prompt: prompt,
        role: 'professional',
        temperature: 0.2
      });

      let cleanCode = response.replace(/```mermaid/g, '').replace(/```/g, '').trim();
      if (!cleanCode.startsWith('mindmap')) {
        cleanCode = 'mindmap\n' + cleanCode;
      }
      return cleanCode;
    } catch (error) {
      console.error('[MindMap] Erro ao gerar mapa:', error);
      return `mindmap\n  root((Minha Jornada))\n    Diagnóstico\n      Acompanhamento Clínico\n    Objetivo\n      ${context.patient?.objective || 'Saúde Geral'}`;
    }
  }
};
