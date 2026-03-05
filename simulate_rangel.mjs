
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function simulate() {
    const { db } = await import('./services/db.js');
    await db.loadFromRemote();

    const clinicId = 'c1';
    const rangelPid = 'p3';

    console.log(`\n=== SIMULATING PROFESSIONAL MODE FOR RANGEL (PID: ${rangelPid}) ===`);

    // This is EXACTLY how Patients.tsx calls it
    const patientsFound = await db.getPatients(clinicId, rangelPid, 'PROFESSIONAL');

    console.log(`\nPatients returned by getPatients for Rangel: ${patientsFound.length}`);
    patientsFound.forEach(p => {
        const isAssigned = p.professionalId === rangelPid;
        const hasAppointment = db.appointments.some(a => a.patientId === p.id && a.professionalId === rangelPid);

        console.log(`- ${p.name.padEnd(30)} | Assigned: ${isAssigned ? 'YES' : 'NO '} | Has Appt: ${hasAppointment ? 'YES' : 'NO '} | Actual PID: ${p.professionalId}`);
    });

    console.log("\n=== ALL REGISTERED PROFESSIONALS IN CLINIC c1 ===");
    db.users.filter(u => u.clinicId === clinicId).forEach(u => {
        console.log(`User: ${u.name.padEnd(20)} | Role: ${u.role.padEnd(15)} | PID: ${u.professionalId || "NONE"}`);
    });
}

simulate().catch(console.error);
