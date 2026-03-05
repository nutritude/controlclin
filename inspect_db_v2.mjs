import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

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

async function inspect() {
    console.log("Starting inspection...");
    const clinicsRef = collection(db, "clinics");
    const clinicsSnap = await getDocs(clinicsRef);
    console.log(`Found ${clinicsSnap.size} clinics in 'clinics' collection.`);

    for (const docSnap of clinicsSnap.docs) {
        console.log(`Clinic document: ${docSnap.id}`);
        // Check for 'data/main' subcollection
        const mainRef = doc(db, "clinics", docSnap.id, "data", "main");
        const mainSnap = await getDoc(mainRef);
        if (mainSnap.exists()) {
            const data = mainSnap.data();
            console.log(`  - Main data found! Patients: ${data.patients?.length || 0}, Professionals: ${data.professionals?.length || 0}`);
        }
    }

    // Check legacy
    const legacyRef = doc(db, "system_data", "global_v1");
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) {
        const data = legacySnap.data();
        console.log(`Legacy global_v1: Patients: ${data.patients?.length || 0}, Professionals: ${data.professionals?.length || 0}`);
    }

    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
