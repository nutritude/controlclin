import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCaBgmBq4Hj6IjA0765q6kDKk6JWG4_Sws",
    authDomain: "controclin-602b6.firebaseapp.com",
    projectId: "controclin-602b6",
    storageBucket: "controclin-602b6.firebasestorage.app",
    messagingSenderId: "510250226894",
    appId: "1:510250226894:web:265ccdd6f92c55ca656c9f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function repair(clinicId) {
    const docRef = doc(db, "clinics", clinicId, "data", "main");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        console.log(`Clinic ${clinicId} not found.`);
        return;
    }

    const data = snap.data();
    let patients = data.patients || [];
    let professionals = data.professionals || [];
    let users = data.users || [];

    console.log(`Initial: ${patients.length} patients, ${professionals.length} professionals, ${users.length} users.`);

    // 1. Map old IDs to new IDs
    // Dr. Rangel: p-rangel -> p3, u-rangel
    // Dra. Marcella: p-marcella -> p2, u-marcella

    const idMap = {
        'p-rangel': 'p3',
        'p-marcella': 'p2',
        'p1': 'p3', // Some might be p1
        'system-demo': 'p3' // Also move demo patients to Rangel for visibility
    };

    // 2. Uniformize Patients
    patients = patients.map(p => {
        const oldId = p.professionalId;
        if (idMap[oldId]) {
            console.log(`Mapping patient ${p.name}: ${oldId} -> ${idMap[oldId]}`);
            return { ...p, professionalId: idMap[oldId] };
        }
        // If professionalId is missing or "system-demo", assign to p3 (Rangel)
        if (!p.professionalId || p.professionalId === 'undefined' || p.professionalId === 'system-demo') {
            return { ...p, professionalId: 'p3' };
        }
        return p;
    });

    // 3. Ensure Professionals exist
    const requiredProfs = [
        { id: 'p3', clinicId: 'c1', userId: 'u-rangel', name: 'Dr. Rangel', email: 'rangel@control.com', specialty: 'Dermatologia', registrationNumber: 'CRM', color: 'bg-blue-200', isActive: true },
        { id: 'p2', clinicId: 'c1', userId: 'u-marcella', name: 'Dra. Marcella', email: 'marcella@control.com', specialty: 'Nutrição', registrationNumber: 'CRN', color: 'bg-green-200', isActive: true },
    ];

    requiredProfs.forEach(rp => {
        if (!professionals.find(p => p.id === rp.id)) {
            console.log(`Adding missing professional: ${rp.name} (${rp.id})`);
            professionals.push(rp);
        }
    });

    // 4. Uniformize Appointments
    let appointments = data.appointments || [];
    appointments = appointments.map(a => {
        if (idMap[a.professionalId]) {
            return { ...a, professionalId: idMap[a.professionalId] };
        }
        if (!a.professionalId) return { ...a, professionalId: 'p3' };
        return a;
    });

    // 5. Update lastModified to force all clients to download
    const updatedData = {
        ...data,
        patients,
        professionals,
        appointments,
        lastModified: Date.now()
    };

    await setDoc(docRef, updatedData);
    console.log("Repair finished successfully.");
}

repair("c1").catch(console.error);
