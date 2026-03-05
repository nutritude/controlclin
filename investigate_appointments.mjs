
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function investigate() {
    const { db } = await import('./services/db.js');
    await db.loadFromRemote();

    console.log("\n=== CROSS-CHECKING APPOINTMENTS FOR RANGEL'S PATIENTS ===");

    const rangelPid = 'p3';
    const rangelPatients = db.patients.filter(p => p.professionalId === rangelPid);

    rangelPatients.forEach(p => {
        const appts = db.appointments.filter(a => a.patientId === p.id);
        if (appts.length > 0) {
            console.log(`\nPatient: ${p.name} (Assigned PID: ${p.professionalId})`);
            appts.forEach(a => {
                const prof = db.users.find(u => u.professionalId === a.professionalId);
                console.log(`  - Appointment with ${prof?.name || "Unknown"} (PID: ${a.professionalId}) on ${a.startTime}`);
            });
        }
    });

    console.log("\n=== PATIENTS WITHOUT ANY ASSIGNED PROFESSIONAL ===");
    db.patients.filter(p => !p.professionalId).forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id})`);
    });
}

investigate().catch(console.error);
