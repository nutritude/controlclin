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

async function check() {
    const snap = await getDoc(doc(db, "clinics", "c1", "data", "main"));
    if (!snap.exists()) {
        console.log("No data");
        return;
    }
    const data = snap.data();
    console.log("=== USERS ===");
    data.users.forEach(u => console.log(JSON.stringify(u)));
    console.log("=== PROFESSIONALS ===");
    data.professionals.forEach(p => console.log(JSON.stringify(p)));
    console.log("=== APPOINTMENTS ===");
    (data.appointments || []).forEach(a => console.log(`Date: ${a.startTime} - Patient: ${a.patientId} - ProfID: ${a.professionalId}`));
    console.log("=== PATIENTS ===");
    data.patients.forEach(p => console.log(`${p.name} - ID: ${p.id} - ProfID: ${p.professionalId} - ClinicID: ${p.clinicId}`));
    console.log("Total Patients count:", data.patients.length);
}
check().catch(console.error);
