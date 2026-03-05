
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function deepDive() {
    const { db } = await import('./services/db.js');
    await db.loadFromRemote();

    console.log("\n=== PROFESSIONALS CLEANUP ANALYSIS ===");
    const users = db.users;
    const profs = db.professionals;

    // Group users by email
    const usersByEmail = {};
    users.forEach(u => {
        if (!usersByEmail[u.email.toLowerCase()]) usersByEmail[u.email.toLowerCase()] = [];
        usersByEmail[u.email.toLowerCase()].push(u);
    });

    for (const [email, userList] of Object.entries(usersByEmail)) {
        if (userList.length > 1) {
            console.log(`\nDuplicate User Email: ${email}`);
            userList.forEach(u => {
                console.log(`  - ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | PID: ${u.professionalId}`);
            });
        }
    }

    console.log("\n=== PATIENTS CLEANUP ANALYSIS ===");
    const patients = db.patients;

    // Group patients by normalized name (lowercase, no spaces)
    const patientsByName = {};
    patients.forEach(p => {
        const norm = p.name.toLowerCase().trim();
        if (!patientsByName[norm]) patientsByName[norm] = [];
        patientsByName[norm].push(p);
    });

    for (const [name, pList] of Object.entries(patientsByName)) {
        if (pList.length > 1) {
            console.log(`\nDuplicate Patient Name: ${name}`);
            pList.forEach(p => {
                const owner = users.find(u => u.professionalId === p.professionalId);
                console.log(`  - ID: ${p.id} | Email: ${p.email} | PID: ${p.professionalId} (Owner: ${owner?.name || 'Unknown'})`);
            });
        }
    }

    console.log("\n=== PATIENTS ASSIGNED TO RANGEL (p3) ===");
    const rangelPat = patients.filter(p => p.professionalId === 'p3');
    rangelPat.forEach(p => {
        console.log(`- ${p.name.padEnd(30)} | ID: ${p.id} | Email: ${p.email}`);
    });
}

deepDive().catch(console.error);
