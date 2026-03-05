
import { db } from './services/db.js';

async function diagnose() {
    await db.loadFromRemote();
    const patients = db.patients;
    const users = db.users;
    const clinics = db.clinics;

    console.log("--- CLINICS ---");
    clinics.forEach(c => console.log(`Clinic: ${c.name} (${c.id})`));

    console.log("\n--- USERS/PROFESSIONALS ---");
    users.forEach(u => {
        console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role} | PID: ${u.professionalId}`);
    });

    console.log("\n--- PATIENTS DISTRIBUTION ---");
    const distribution = {};
    patients.forEach(p => {
        const pid = p.professionalId || "UNASSIGNED";
        distribution[pid] = (distribution[pid] || 0) + 1;
    });

    for (const [pid, count] of Object.entries(distribution)) {
        const professional = users.find(u => u.professionalId === pid);
        const name = professional ? professional.name : (pid === "UNASSIGNED" ? "UNASSIGNED" : "UNKNOWN PID: " + pid);
        console.log(`Professional: ${name} (ID: ${pid}) -> ${count} patients`);
    }

    console.log("\n--- LISTING RANGEL'S PATIENTS AND OTHERS ---");
    const rangel = users.find(u => u.email === 'rangel@control.com');
    if (rangel) {
        console.log(`Rangel PID: ${rangel.professionalId}`);
        patients.forEach(p => {
            if (p.professionalId === rangel.professionalId) {
                console.log(`[RANGEL] Patient: ${p.name} (ID: ${p.id})`);
            } else {
                console.log(`[OTHER] Patient: ${p.name} (PID: ${p.professionalId})`);
            }
        });
    }
}

diagnose();
