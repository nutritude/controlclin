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
    const p = snap.data().patients.find(x => x.name.includes("Joventina"));

    console.log("--- HISTÓRICO ANTROPOMÉTRICO ---");
    p.anthropometryHistory?.forEach(h => {
        console.log(h.date, "Peso:", h.weight);
    });

    console.log("\n--- PEDIDOS DE EXAMES ---");
    p.examRequests?.forEach(e => {
        console.log(e.date, "Status:", e.status, "Title:", e.title);
    });

    console.log("\n--- RESULTADOS DE EXAMES ---");
    p.clinicalSummary?.exams?.forEach(e => {
        console.log(e.date || 'S/D', "Tipo:", e.type, "Valor:", e.value);
    });
}
check().catch(console.error);
