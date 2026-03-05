
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function diagnose() {
    // Dynamic import to ensure global.localStorage is set
    const { db } = await import('./services/db.js');

    await db.loadFromRemote(); // This will use Firebase

    const patients = db.patients;
    const users = db.users;

    console.log("\n--- PROFESSIONALS ---");
    users.forEach(u => {
        if (u.professionalId) {
            console.log(`Prof: ${u.name} | PID: ${u.professionalId} | Email: ${u.email}`);
        }
    });

    const rangel = users.find(u => u.email === 'rangel@control.com');
    const rangelPid = rangel?.professionalId;
    console.log(`\nRangel PID: ${rangelPid}`);

    console.log("\n--- PATIENTS DISTRIBUTION ---");
    patients.forEach(p => {
        const owner = users.find(u => u.professionalId === p.professionalId);
        console.log(`Patient: ${p.name.padEnd(30)} | Owner: ${(owner?.name || "UNASSIGNED").padEnd(20)} | PID: ${p.professionalId}`);
    });

    console.log("\n--- APPOINTMENTS RELATIONS ---");
    const appts = db.appointments;
    appts.forEach(a => {
        const p = patients.find(pt => pt.id === a.patientId);
        const u = users.find(usr => usr.professionalId === a.professionalId);
        console.log(`Appt: ${p?.name || "Unknown"} with ${u?.name || "Unknown"} (PID: ${a.professionalId})`);
    });
}

diagnose().catch(console.error);
