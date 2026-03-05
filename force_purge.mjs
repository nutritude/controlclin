
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function forceCleanup() {
    const { db } = await import('./services/db.js');
    const { doc, setDoc } = await import('firebase/firestore');
    const { db: firestore } = await import('./services/firebase.js');

    await db.loadFromRemote();

    console.log("=== STARTING AGGRESSIVE DATABASE PURGE ===");

    // 1. CANONICAL PROFESSIONALS
    const CANONICAL_PIDS = ['p3', 'p2', 'p-debora', 'p-matheus'];
    const CANONICAL_EMAILS = ['rangel@control.com', 'marcella@control.com', 'debora@control.com', 'matheus@control.com', 'root@control.com'];

    // Filter Users: Keep only those with canonical emails, prioritize ADMIN
    const cleanUsers = [];
    const seenEmails = new Set();
    // Sort to keep the best record for each email
    const sortedUsers = [...db.users].sort((a, b) => {
        if (a.role === 'CLINIC_ADMIN' && b.role !== 'CLINIC_ADMIN') return -1;
        if (a.role !== 'CLINIC_ADMIN' && b.role === 'CLINIC_ADMIN') return 1;
        return 0;
    });

    sortedUsers.forEach(u => {
        const email = u.email.toLowerCase();
        if (CANONICAL_EMAILS.includes(email) && !seenEmails.has(email)) {
            // Fix PID
            if (email === 'rangel@control.com') u.professionalId = 'p3';
            if (email === 'marcella@control.com') u.professionalId = 'p2';
            if (email === 'debora@control.com') u.professionalId = 'p-debora';
            if (email === 'matheus@control.com') u.professionalId = 'p-matheus';

            cleanUsers.push(u);
            seenEmails.add(email);
        }
    });

    // Filter Professionals: Keep only canonical IDs
    const cleanProfs = db.professionals.filter(p => CANONICAL_PIDS.includes(p.id));
    // Deduplicate by ID
    const finalProfs = [];
    const seenPids = new Set();
    cleanProfs.forEach(p => {
        if (!seenPids.has(p.id)) {
            finalProfs.push(p);
            seenPids.add(p.id);
        }
    });

    // 2. PATIENTS: REASSIGN AND DEDUPLICATE
    const cleanPatients = [];
    const seenPatientNames = new Map();

    db.patients.forEach(p => {
        // Validation: Assign orphans to Rangel (p3)
        if (!CANONICAL_PIDS.includes(p.professionalId)) {
            console.log(`Reassigning orphan patient ${p.name} from ${p.professionalId} to p3`);
            p.professionalId = 'p3';
        }

        // Hardcoded assignments
        if (['Maria Joaquina', 'Paciente Mulher Teste'].includes(p.name)) {
            p.professionalId = 'p2';
        }

        const normName = p.name.toLowerCase().trim();
        const hasData = (p.anthropometryHistory?.length || 0) > 0 || (p.clinicalNotes?.length || 0) > 0;

        if (seenPatientNames.has(normName)) {
            const existingIdx = seenPatientNames.get(normName);
            const existingP = cleanPatients[existingIdx];
            const alreadyHasData = (existingP.anthropometryHistory?.length || 0) > 0 || (existingP.clinicalNotes?.length || 0) > 0;

            if (hasData && !alreadyHasData) {
                // Replace empty existing with this one that has data
                console.log(`Deduplicating ${p.name}: replacing empty record with one that has data`);
                cleanPatients[existingIdx] = p;
            } else {
                console.log(`Deduplicating ${p.name}: skipping redundant/empty record`);
            }
        } else {
            cleanPatients.push(p);
            seenPatientNames.set(normName, cleanPatients.length - 1);
        }
    });

    // 3. APPOINTMENTS: CLEANUP ORPHANS
    const cleanAppts = db.appointments.filter(a => {
        const patientExists = cleanPatients.find(p => p.id === a.patientId);
        const profExists = finalProfs.find(p => p.id === a.professionalId);
        return patientExists && profExists;
    });

    // 4. OVERWRITE REMOTE (Bypassing Safe Merge)
    const data = {
        clinics: db.clinics,
        users: cleanUsers,
        professionals: finalProfs,
        patients: cleanPatients,
        appointments: cleanAppts,
        patientEvents: db.patientEvents, // keeping events for now
        exams: db.exams,
        alerts: db.alerts,
        examRequests: db.examRequests,
        mipanAssessments: db.mipanAssessments,
        prescriptions: db.prescriptions,
        updatedAt: new Date().toISOString(),
        lastModified: Date.now()
    };

    const docRef = doc(firestore, "clinics", "c1", "data", "main");
    await setDoc(docRef, JSON.parse(JSON.stringify(data)));

    console.log("=== DATABASE OVERWRITE SUCCESSFUL ===");
}

forceCleanup().catch(console.error);
