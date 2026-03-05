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
        console.log(`- Last Modified: ${new Date(data.lastModified || 0).toISOString()}`);
        console.log(`- Patients count: ${data.patients?.length || 0}`);
        console.log(`- Professionals count: ${data.professionals?.length || 0}`);
        if (data.patients && data.patients.length > 0) {
            console.log(`- Sample patient: ${data.patients[0].name} (ID: ${data.patients[0].id})`);
            // Check for Joventina
            const jov = data.patients.find(p => p.name.includes("Joventina"));
            if (jov) console.log(`- JOVENTINA FOUND in ${clinicId}`);
        }
    } else {
        console.log(`Clinic: ${clinicId} - DOES NOT EXIST`);
    }
}

async function run() {
    await inspect("c1");
    await inspect("global_v1");
    await inspect("control");
}

run().catch(console.error);
