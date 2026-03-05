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

async function updateJoventina() {
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

    const record1 = {
        date: "2026-01-16T09:00:00.000Z",
        weight: 83.3,
        bmi: 32.5,
        bodyFatPercentage: 45.3,
        leanMass: 45.6,
        height: 1.60,
        // Preserving other measurements if they existed in the source, 
        // but user only specified these 4. Let's keep the core ones from the existing record to avoid losing data they didn't mention.
        circNeck: 35,
        circWaist: 80,
        circHip: 105,
        circAbdomen: 105,
        circThigh: 52,
        circCalf: 33.5,
        skinfoldTriceps: 28,
        skinfoldBiceps: 22,
        skinfoldSubscapular: 37,
        skinfoldSuprailiac: 35
    };

    const record2 = {
        date: "2026-03-03T21:00:00.000Z",
        weight: 81.91,
        bmi: 32,
        bodyFatPercentage: 45,
        leanMass: 45,
        height: 1.60,
        // Preserving other measurements from current 03/04 record (which user says is actually 03/03 21:00)
        circNeck: 35,
        circWaist: 94.5,
        circAbdomen: 101.5,
        circHip: 114.5,
        circThigh: 55,
        circCalf: 34,
        skinfoldTriceps: 26,
        skinfoldBiceps: 23,
        skinfoldSubscapular: 34,
        skinfoldSuprailiac: 36
    };

    const newHistory = [record1, record2];

    // Sort just in case
    newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    patients[jovIdx].anthropometryHistory = newHistory;
    // Update summary with the latest record
    patients[jovIdx].anthropometry = { ...record2 };

    await setDoc(docRef, { ...data, lastModified: Date.now() });
    console.log("Joventina history adjusted successfully.");
}

updateJoventina().catch(console.error);
