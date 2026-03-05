import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function inspect(clinicId) {
    const docRef = doc(db, "clinics", clinicId, "data", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        console.log(`Clinic: ${clinicId}`);
        console.log(`- Professionals:`);
        (data.professionals || []).forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));

        console.log(`- Patients:`);
        (data.patients || []).forEach(p => {
            if (p.name.includes("Joventina") || p.id.startsWith("pt-")) {
                console.log(`  - ${p.name} (ID: ${p.id}, professionalId: ${p.professionalId})`);
            }
        });
    }
}

inspect("c1").catch(console.error);
