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
    data.users.forEach(u => console.log(`${u.email} - Role: ${u.role} - ID: ${u.id} - name: ${u.name}`));
    console.log("=== PROFESSIONALS ===");
    data.professionals.forEach(p => console.log(`${p.email} - ID: ${p.id} - name: ${p.name}`));
    console.log("Patients count:", data.patients.length);
}
check().catch(console.error);
