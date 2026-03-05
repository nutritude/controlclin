
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function cleanup() {
    const { db } = await import('./services/db.js');
    await db.loadFromRemote();

    console.log("=== STARTING DATABASE REORGANIZATION ===");

    // 1. CONSOLIDAR PROFISSIONAIS (Canonical IDs)
    const CANONICAL = {
        'rangel@control.com': 'p3',
        'marcella@control.com': 'p2',
        'debora@control.com': 'p-debora',
        'matheus@control.com': 'p-matheus'
    };

    // Update Users and Professionals to canonical IDs
    db.users.forEach(u => {
        const canonicalPid = CANONICAL[u.email.toLowerCase()];
        if (canonicalPid) {
            if (u.professionalId !== canonicalPid) {
                console.log(`Updating User ${u.name} (${u.email}): PID ${u.professionalId} -> ${canonicalPid}`);
                u.professionalId = canonicalPid;
            }
        }
    });

    db.professionals.forEach(p => {
        const canonicalPid = CANONICAL[p.email.toLowerCase()];
        if (canonicalPid) {
            if (p.id !== canonicalPid) {
                console.log(`Updating Professional Record ${p.name}: ID ${p.id} -> ${canonicalPid}`);
                p.id = canonicalPid;
            }
        }
    });

    // Remove duplicate professional records (keep only canonical)
    const uniqueProfs = [];
    const seenPids = new Set();
    db.professionals.forEach(p => {
        if (!seenPids.has(p.id)) {
            uniqueProfs.push(p);
            seenPids.add(p.id);
        }
    });
    db.professionals = uniqueProfs;

    // Remove duplicate users (keep canonical, prioritize CLINIC_ADMIN)
    const uniqueUsers = [];
    const seenEmails = new Set();
    db.users.sort((a, b) => (a.role === 'CLINIC_ADMIN' ? -1 : 1)).forEach(u => {
        if (!seenEmails.has(u.email.toLowerCase())) {
            uniqueUsers.push(u);
            seenEmails.add(u.email.toLowerCase());
        }
    });
    db.users = uniqueUsers;

    // 2. REORGANIZAR PACIENTES
    // - Garantir que todos apontam para PIDs válidos e vivos
    // - Fundir duplicatas vazias de Jessyca Melo
    const cleanedPatients = [];
    const seenPatientNames = new Map();

    db.patients.forEach(p => {
        // Fix assignment if it was pointing to a deleted/incorrect PID
        const user = db.users.find(u => u.professionalId === p.professionalId);
        if (!user && p.professionalId) {
            // If we can't find the professional, map by name or default to Rangel (p3) if it's clinic c1
            console.log(`Patient ${p.name} has orphan PID ${p.professionalId}. Reassigning to p3.`);
            p.professionalId = 'p3';
        }

        const normName = p.name.toLowerCase().trim();
        // Simple deduplication for empty records
        const isEmpty = (!p.anthropometryHistory || p.anthropometryHistory.length === 0) && (!p.clinicalNotes || p.clinicalNotes.length === 0);

        if (seenPatientNames.has(normName) && isEmpty) {
            console.log(`Found empty duplicate of ${p.name} (ID: ${p.id}). Skipping to deduplicate.`);
            return;
        }

        seenPatientNames.set(normName, p.id);
        cleanedPatients.push(p);
    });
    db.patients = cleanedPatients;

    // 3. ATRIBUIR PACIENTES ESPECÍFICOS (MARCELLA)
    // Maria Joaquina e Paciente Mulher Teste devem ser da Marcella (p2)
    db.patients.forEach(p => {
        if (['Maria Joaquina', 'Paciente Mulher Teste'].includes(p.name)) {
            p.professionalId = 'p2';
            console.log(`Ensuring ${p.name} is assigned to Marcella (p2)`);
        }
    });

    // 4. ATRIBUIR PACIENTES ESPECÍFICOS (DÉBORA)
    // Se houver algum paciente que deva ser da Débora, adicionar aqui.

    // 5. UPDATE APPOINTMENTS
    db.appointments.forEach(a => {
        const p = db.patients.find(pt => pt.id === a.patientId);
        if (p) {
            a.professionalId = p.professionalId;
        }
    });

    console.log("=== CLEANUP FINISHED. SAVING TO REMOTE... ===");
    await db.saveToStorage(true);
    console.log("Database reorganization completed and synced.");
}

cleanup().catch(console.error);
