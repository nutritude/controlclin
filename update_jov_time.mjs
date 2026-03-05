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

async function updateTime() {
    const docRef = doc(db, "clinics", "c1", "data", "main");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        console.error("Data not found");
        return;
    }

    const data = snap.data();
    const patients = data.patients || [];
    const jovIdx = patients.findIndex(p => p.id === 'pt-1772617932879');

    if (jovIdx === -1) {
        console.error("Joventina not found");
        return;
    }

    const history = patients[jovIdx].anthropometryHistory || [];
    const recordIdx = history.findIndex(r => r.date.startsWith("2026-03-03"));

    if (recordIdx > -1) {
        // Change from 21:00 to 10:50
        history[recordIdx].date = "2026-03-03T10:50:00.000Z";
        console.log("Updated record date to 2026-03-03T10:50:00.000Z");

        // Also update the summary if it's the same record
        if (patients[jovIdx].anthropometry && patients[jovIdx].anthropometry.date.startsWith("2026-03-03")) {
            patients[jovIdx].anthropometry.date = "2026-03-03T10:50:00.000Z";
        }
    } else {
        console.error("Record for 2026-03-03 not found");
    }

    await setDoc(docRef, { ...data, lastModified: Date.now() });
    console.log("Joventina record time adjusted successfully.");
}

updateTime().catch(console.error);
