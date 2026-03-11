const fs = require('fs');
const file = 'services/db.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /    async addTransaction\(user: User, patientId: string, data: any\) \{[\s\S]*?async updateTransaction\(user: User, patientId: string, transactionId: string, updates: Partial<FinancialTransaction>\) \{[\s\S]*?updatedTransactions\[tIdx\];\n    \}/;

const newCode = `    // ============================================================
    // MÓDULO FINANCEIRO v2 — Cloud-First
    // ============================================================

    getFinancialAiContext(patientId: string): string {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) return "";
        const f = this.patients[pIdx].financial;
        if (!f || !f.transactions) return "Sem histórico financeiro.";

        const activeTransactions = f.transactions.filter(t => !t.isDeleted);
        const totalPaid = activeTransactions.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0);
        const totalPending = activeTransactions.filter(t => t.status === 'PENDENTE').reduce((acc, t) => acc + t.amount, 0);

        return \`Financeiro do Paciente: R$\${totalPaid} Pagos, R$\${totalPending} Pendentes. Histórico de \${activeTransactions.length} transações.\`;
    }

    async addTransaction(user: User, patientId: string, data: any) {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) throw new Error("Paciente não encontrado");

        const patient = this.patients[pIdx];

        const financial: FinancialInfo = patient.financial ? { ...patient.financial } : { mode: 'PARTICULAR', transactions: [] };
        const transactions: FinancialTransaction[] = financial.transactions ? [...financial.transactions] : [];

        const newTrans: FinancialTransaction = {
            id: \`tr-\${Date.now()}\`,
            date: data.date || new Date().toISOString().split('T')[0],
            description: data.description || 'Procedimento Clínico',
            amount: data.amount || 0,
            method: data.method || 'PIX',
            status: data.status || 'PENDENTE',
            isDeleted: false,
            // Detalhes extras TISS / AI
            authorizationCode: data.authorizationCode,
            installments: data.installments,
            installmentCount: data.installmentCount,
            originalAmount: data.originalAmount,
            discountPercent: data.discountPercent,
            interestPercent: data.interestPercent,
            aiContextFlag: data.aiContextFlag
        };

        transactions.unshift(newTrans);

        this.patients[pIdx] = {
            ...patient,
            financial: { ...financial, transactions }
        };

        this.logPatientEvent(patientId, 'PAYMENT_RECORDED', { amount: data.amount }, \`Pagamento registrado: R$\${data.amount}\`, user);
        
        // FORÇA SALVAMENTO NO CLOUD
        await this.saveToStorage(true);
        console.log(\`[DB] Transação adicionada (cloud-first) para \${patientId}: R$\${data.amount}\`);
        return newTrans;
    }

    async updateTransaction(user: User, patientId: string, transactionId: string, updates: Partial<FinancialTransaction>) {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) throw new Error("Paciente não encontrado");

        const patient = this.patients[pIdx];
        if (!patient.financial?.transactions) throw new Error("Nenhuma transação encontrada");

        const tIdx = patient.financial.transactions.findIndex(t => t.id === transactionId);
        if (tIdx === -1) throw new Error("Transação não encontrada");

        const updatedTransactions = [...patient.financial.transactions];
        
        // Verifica se a transação está deletada (se soft delete)
        if (updatedTransactions[tIdx].isDeleted) {
           throw new Error("Transação deletada e não pode ser editada");
        }

        updatedTransactions[tIdx] = { ...updatedTransactions[tIdx], ...updates };

        this.patients[pIdx] = {
            ...patient,
            financial: { ...patient.financial, transactions: updatedTransactions }
        };

        if (updates.status) {
            this.logPatientEvent(patientId, 'PAYMENT_RECORDED', { transactionId, newStatus: updates.status }, \`Status de pagamento alterado para \${updates.status}\`, user);
        }

        // FORÇA SALVAMENTO NO CLOUD
        await this.saveToStorage(true);
        console.log(\`[DB] Transação autalizada (cloud-first) para \${patientId} / \${transactionId}\`);
        return updatedTransactions[tIdx];
    }

    async softDeleteTransaction(user: User, patientId: string, transactionId: string) {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) throw new Error("Paciente não encontrado");

        const patient = this.patients[pIdx];
        if (!patient.financial?.transactions) throw new Error("Nenhuma transação encontrada");

        const tIdx = patient.financial.transactions.findIndex(t => t.id === transactionId);
        if (tIdx === -1) throw new Error("Transação não encontrada");

        const updatedTransactions = [...patient.financial.transactions];
        
        // Apenas marca como deletada ao invés de excluir da array (Soft Delete)
        updatedTransactions[tIdx] = { 
            ...updatedTransactions[tIdx], 
            isDeleted: true,
            status: 'CANCELADO' // Força status cancelado para sair dos reportes
        };

        this.patients[pIdx] = {
            ...patient,
            financial: { ...patient.financial, transactions: updatedTransactions }
        };

        this.logPatientEvent(patientId, 'PAYMENT_RECORDED', { transactionId, isDeleted: true }, \`Transação excluída (soft-delete)\`, user);
        
        // FORÇA SALVAMENTO NO CLOUD
        await this.saveToStorage(true);
        console.log(\`[DB] Transação deletada via soft delete (cloud-first) para \${patientId} / \${transactionId}\`);
        return true;
    }`;

content = content.replace(regex, newCode);
fs.writeFileSync(file, content);
console.log('File successfully patched.');
