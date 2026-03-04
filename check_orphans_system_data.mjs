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

async function checkOrphans() {
    const snap = await getDoc(doc(db, "system_data", "main"));
    if (snap.exists()) {
        const events = snap.data().patientEvents || [];
        const joventinaEvents = events.filter(e => e.patientId === 'pt-1772617932879' || e.summary.includes('81.9'));
        console.log("Found Events in system_data/main:", joventinaEvents.length);

        const exams = snap.data().exams || [];
        console.log("Exams count:", exams.length);
    }
}

checkOrphans().catch(console.error);
