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
const firestore = getFirestore(app);

async function restore() {
    console.log("Starting restoration of professionals Matheus and Debora...");
    const docRef = doc(firestore, "clinics", "c1", "data", "main");
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
        console.error("Clinic c1 data not found!");
        return;
    }

    const data = snap.data();
    const users = data.users || [];
    const professionals = data.professionals || [];

    // Find the correct user IDs from the users list
    const deboraUser = users.find(u => u.email === 'debora@control.com');
    const matheusUser = users.find(u => u.email === 'matheus@control.com');

    if (!deboraUser || !matheusUser) {
        console.error("Users not found in database! Debora:", !!deboraUser, "Matheus:", !!matheusUser);
        // We might need to recreate them if they were deleted, but script earlier showed they exist.
    }

    let updatedCount = 0;

    professionals.forEach(p => {
        if (p.id === 'p-debora' || p.email === 'debora@control.com') {
            console.log("Updating Debora...");
            p.clinicId = 'c1'; // Fix clinicId
            p.isActive = true;  // Ensure active
            if (deboraUser) p.userId = deboraUser.id; // Link to correct user
            p.id = 'p-debora'; // Ensure correct ID
            updatedCount++;
        }
        if (p.id === 'p-matheus' || p.email === 'matheus@control.com') {
            console.log("Updating Matheus...");
            p.clinicId = 'c1'; // Fix clinicId
            p.isActive = true;  // Ensure active
            if (matheusUser) p.userId = matheusUser.id; // Link to correct user
            p.id = 'p-matheus'; // Ensure correct ID
            updatedCount++;
        }
    });

    // If they were completely missing from professionals array (unlikely based on check_firebase_now), add them
    if (!professionals.find(p => p.id === 'p-debora') && deboraUser) {
        console.log("Debora missing from professionals array. Adding her.");
        professionals.push({
            id: 'p-debora',
            clinicId: 'c1',
            userId: deboraUser.id,
            name: deboraUser.name,
            email: deboraUser.email,
            phone: '',
            specialty: 'Nutrição',
            registrationNumber: 'CRN',
            color: 'bg-purple-200',
            isActive: true
        });
        updatedCount++;
    }

    if (!professionals.find(p => p.id === 'p-matheus') && matheusUser) {
        console.log("Matheus missing from professionals array. Adding him.");
        professionals.push({
            id: 'p-matheus',
            clinicId: 'c1',
            userId: matheusUser.id,
            name: matheusUser.name,
            email: matheusUser.email,
            phone: '',
            specialty: 'Médico',
            registrationNumber: 'CRM',
            color: 'bg-indigo-200',
            isActive: true
        });
        updatedCount++;
    }

    if (updatedCount > 0) {
        data.lastModified = Date.now();
        data.updatedAt = new Date().toISOString();
        await setDoc(docRef, data);
        console.log("Successfully restored professionals to clinic c1!");
    } else {
        console.log("No changes needed or could not find records to update.");
    }
}

restore().catch(console.error);
