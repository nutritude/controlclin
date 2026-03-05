
// Mock localStorage para Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function checkExclusivity() {
    const { db } = await import('./services/db.js');
    await db.loadFromRemote();

    console.log("\n=== RELATÓRIO DE EXCLUSIVIDADE POR PROFISSIONAL ===");

    const profs = db.professionals; // p3, p2, p-debora, p-matheus
    const patients = db.patients;

    profs.forEach(prof => {
        const assignedPatients = patients.filter(p => p.professionalId === prof.id);
        console.log(`\nPROFISSIONAL: ${prof.name} (ID: ${prof.id})`);
        console.log(`Quantidade de Pacientes: ${assignedPatients.length}`);

        if (assignedPatients.length > 0) {
            assignedPatients.forEach(p => {
                console.log(`  - [Exclusivo] ${p.name.padEnd(30)} | Email: ${p.email || 'N/A'}`);
            });
        } else {
            console.log("  - (Sem pacientes atribuídos no momento)");
        }
    });

    console.log("\n=== VERIFICAÇÃO DE VAZAMENTO (PACIENTES SEM DONO OU IDS INVÁLIDOS) ===");
    const validPids = profs.map(p => p.id);
    const orphans = patients.filter(p => !validPids.includes(p.professionalId));

    if (orphans.length === 0) {
        console.log("✅ CHECK: 100% dos pacientes estão vinculados a um dos 4 profissionais canônicos.");
    } else {
        console.log(`❌ ATENÇÃO: Encontrados ${orphans.length} pacientes órfãos.`);
        orphans.forEach(p => console.log(`  - ${p.name} (PID Atual: ${p.professionalId})`));
    }
}

checkExclusivity().catch(console.error);
