import fs from 'fs';
const file = 'pages/PatientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Prove that we are updating the file
content = content.replace('>Liberar App</span>', '>LIBERAR ACESSO V2</span>');

// Check if handleDeleteTransaction is present
if (!content.includes('handleDeleteTransaction')) {
    console.log("Adding handleDeleteTransaction...");
    // ... logic to add it ... (already there likely)
}

// Clean up the Actions TD
const actionsTdStart = '<td className="px-6 py-4 whitespace-nowrap text-center">';
const actionsTdEnd = '</td>';

// Find the section of the financial table
const startSearch = 'Extrato de Lançamentos';
const tableStartIdx = content.indexOf(startSearch);
const actionsTdIdx = content.indexOf(actionsTdStart, tableStartIdx);
const nextTrIdx = content.indexOf('</tr>', actionsTdIdx);

// We'll replace the whole TD content for the actions
const targetActions = content.substring(actionsTdIdx, nextTrIdx);

const newActions = `<td className="px-6 py-4 whitespace-nowrap text-center">
    <div className="flex items-center justify-center gap-2">
        {/* PENDENTE / AGUARDANDO */}
        {(t.status === 'PENDENTE' || t.status === 'AGUARDANDO_AUTORIZACAO') && !t.isDeleted && (
            <button
                onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(t); }}
                className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
                Confirmar
            </button>
        )}
        
        {/* PAGO / RECIBO */}
        {t.status === 'PAGO' && !t.isDeleted && (
            <>
                <button
                    onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(t); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    title="PDF"
                >
                    <Icons.FileText className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleSendReceiptViaWhatsApp(t); }}
                    className="p-1 rounded hover:bg-green-50 text-green-600"
                    title="WhatsApp"
                >
                    <Icons.Smartphone className="w-4 h-4" />
                </button>
            </>
        )}

        {/* LIXEIRA (Sempre visível se não deletado) */}
        {!t.isDeleted ? (
            <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
                className="p-1 rounded hover:bg-red-50 text-red-500"
                title="Excluir Lançamento"
            >
                <Icons.Trash className="w-4 h-4" />
            </button>
        ) : (
            <span className="text-[10px] font-bold text-red-400 uppercase italic">Cancelado</span>
        )}
    </div>
</td>`;

// Let's use a more robust replacement for the whole TD
content = content.substring(0, actionsTdIdx) + newActions + content.substring(nextTrIdx);

fs.writeFileSync(file, content);
console.log("UI Overhauled in PatientDetails.tsx");
