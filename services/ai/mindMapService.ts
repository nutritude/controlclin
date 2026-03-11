import { OpenRouterService } from './openRouterService';

export const MindMapService = {
    /**
     * Gera o código Mermaid para um mapa mental baseado no contexto do paciente.
     */
    async generatePatientMindMap(context: any): Promise<string> {
        console.log('[AI MindMap] Gerando mapa mental explicativo...');

        const prompt = `
      Você é um especialista em comunicação visual para saúde.
      Crie um mapa mental no formato Mermaid (sintaxe mindmap) que explique para o paciente a conexão entre seu DIAGNÓSTICO, seus EXAMES e a CONDUTA (Dieta/Suplementos).

      CONTEXTO:
      ${JSON.stringify(context)}

      REGRAS:
      1. Use a sintaxe Mermaid MINDMAP (ex começa com 'mindmap').
      2. O nó central deve ser o objetivo do paciente ou o nome dele.
      3. Crie ramos para: "Meus Exames", "Diagnóstico" e "Ações do Meu Plano".
      4. Use linguagem empática e motivadora.
      5. Não use caracteres especiais que quebrem o código Mermaid (como aspas duplas internas).
      6. Retorne APENAS o código do diagrama, sem explicações.

      Exemplo de saída:
      mindmap
        root((Minha Saúde))
          Exames
            Glicose::Controlada
          Plano
            Refeição::Foco em fibras
    `;

        try {
            const response = await OpenRouterService.ask({
                prompt: prompt,
                role: 'professional',
                temperature: 0.3
            });

            // Limpeza básica do código mermaid
            return response.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        } catch (error) {
            console.error('[MindMap] Erro ao gerar mapa:', error);
            return `mindmap\n  root((Minha Jornada))\n    Diagnóstico\n      Acompanhamento Clínico\n    Objetivo\n      ${context.patient?.objective || 'Saúde Geral'}`;
        }
    }
};
