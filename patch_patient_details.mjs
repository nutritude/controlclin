import fs from 'fs';
const file = 'pages/PatientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        window.open(WhatsAppService.generateLink(patient.phone, msg), '_blank');\n    };\n\n    if (loading || !patient) return <div>Carregando prontuário...</div>;`;

const newCode = `        window.open(WhatsAppService.generateLink(patient.phone, msg), '_blank');
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
    };

    if (loading || !patient) return <div>Carregando prontuário...</div>;`;

content = content.replace(targetStr, newCode);
fs.writeFileSync(file, content);
console.log('Done');
