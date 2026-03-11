import fs from 'fs';
const file = 'pages/PatientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Trash2 import
content = content.replace('import { Trash2 } from "lucide-react";\n', '');

// 2. Add handleDeleteTransaction if it's not there (it should be, but let's double check)
if (!content.includes('handleDeleteTransaction')) {
    const targetStr = "window.open(WhatsAppService.generateLink(patient.phone, msg), '_blank');\n    };";
    const newFunc = `        window.open(WhatsAppService.generateLink(patient.phone, msg), '_blank');
    };

    const handleDeleteTransaction = async (transId: string) => {
        if (!patient || !clinic) return;
        const confirmPay = window.confirm("Tem certeza que deseja cancelar esta transação? Ela não será removida do banco, mas não será contabilizada e nem editável.");
        if (!confirmPay) return;

        try {
            await db.softDeleteTransaction(user, patient.id, transId);
            await fetchData(patient.id);
        } catch (err: any) {
            console.error("Erro ao cancelar transação:", err);
            alert("Erro ao cancelar a transação: " + (err.message || err));
        }
    };`;
    content = content.replace(targetStr, newFunc);
}

// 3. Update the table row for opacity
const tableRowRegex = /<tr key=\{t\.id\} className=\{\`(isManagerMode \? 'hover:bg-gray-700' : 'hover:bg-emerald-50') transition-colors\`\}>/g;
content = content.replace(tableRowRegex, '<tr key={t.id} className={`${isManagerMode ? \'hover:bg-gray-700\' : \'hover:bg-emerald-50\'} transition-colors ${t.isDeleted ? \'opacity-50 grayscale\' : \'\'}`}>');

// 4. Inserção do botão de lixo nas ações
// Vou procurar o container de ações e inserir o botão de lixo
const actionsContainerRegex = /<div className="flex items-center justify-center gap-1\.5">/g;
// Precisamos ser mais específicos para não pegar outros containers de ação
const financialActionsPlaceholder = '{/* Financial Actions Placeholder */}';

// Vamos inserir o botão de lixo logo após o botão de WhatsApp ou onde fizer sentido.
// O botão de WhatsApp termina em line 2376. 

// Uma abordagem melhor: encontrar o fim do mapeamento de t.status === 'PAGO'
const whatsappButtonEnd = ' <Icons.Smartphone className="w-4 h-4" />\n                                                                </button>';
const trashButton = `\n                                                                {!t.isDeleted && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
                                                                        title="Cancelar Lançamento"
                                                                        className="p-1.5 rounded-lg transition-colors inline-flex items-center justify-center text-red-500 hover:bg-red-100"
                                                                    >
                                                                        <Icons.Trash className="w-4 h-4" />
                                                                    </button>
                                                                )}`;

// Inserir antes do fechamento do fragmento dos botões de PAGO ou logo após o WhatsApp
content = content.replace(whatsappButtonEnd, whatsappButtonEnd + trashButton);

// E também no caso de PENDENTE/AGUARDANDO se quisermos permitir deletar pendentes
const receiveButtonEnd = '✓ Receber\n                                                            </button>';
content = content.replace(receiveButtonEnd, receiveButtonEnd + trashButton);

fs.writeFileSync(file, content);
console.log('UI Fixed');
