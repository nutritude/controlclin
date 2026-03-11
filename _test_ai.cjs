const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.split('\n').find(line => line.startsWith('VITE_OPENROUTER_API_KEY=')).split('=')[1];

const prompt = `
DADOS CLÍNICOS REAIS DO PACIENTE:
PACIENTE: Teste
OBJETIVO CLÍNICO: Emagrecimento

TAREFA:
Gere um mapa mental Mermaid (sintaxe mindmap) mostrando a cadeia completa de tratamento.
O nó central deve ser o DIAGNÓSTICO PRINCIPAL do paciente.

Ramos obrigatórios:
1. FISIOPATOLOGIA — mecanismo da doença e impacto metabólico
2. ANTROPOMETRIA — estado nutricional atual (IMC, gordura, massa magra)

REGRAS ABSOLUTAS DE SINTAXE MERMAID MINDMAP v10 E ESTRUTURA:
1. PRIMEIRA LINHA: "mindmap" sem nada mais.
2. SEGUNDA LINHA: "  root((TEXTO AQUI))" com 2 espaços de indentação.
3. Cada nível filho adiciona mais 2 espaços exatos.
4. PROIBIDO ABSOLUTAMENTE dentro de qualquer texto de nó: aspas simples/duplas ( ' " ), parênteses e chaves que não sejam delimitadores, e símbolos especiais (# $ & * etc).
5. REGRA DA EXPLICAÇÃO (OBRIGATÓRIO): Para CADA ramo principal que sai do nó central, o PRIMEIRO nó filho deve ser OBRIGATORIAMENTE uma "breve explicação contextualizando", com até 3 linhas visando o paciente leigo. Esta explicação DEVE estar entre colchetes, por exemplo: [Paciente apresenta gordura visceral acima do ideal. Foco na redução...].
6. Os demais nós (dados/parâmetros) devem ter no máximo 5 palavras.
7. Retorne SOMENTE o código mindmap, sem markdown, sem introduções.
`;

fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + key.replace('\r', ''),
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        messages: [
            { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
    })
}).then(r => r.json()).then(data => {
    console.log('--- RAW AI OUTPUT ---');
    console.log(data.choices?.[0]?.message?.content || data);
});
