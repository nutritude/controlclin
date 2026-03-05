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

async function addHistoricData() {
    const docRef = doc(db, "clinics", "c1", "data", "main");
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
        console.error("Main data not found!");
        return;
    }

    const data = snap.data();
    const patients = data.patients || [];
    const jovIdx = patients.findIndex(p => p.id === 'pt-1772617932879');

    if (jovIdx === -1) {
        console.error("Joventina (pt-1772617932879) not found!");
        return;
    }

    const historicRecord = {
        date: "2026-01-16T12:00:00.000Z",
        procedureDate: "2026-01-16T12:00:00.000Z",
        weight: 83.3,
        height: 1.60, // Convert to meters for internal consistency if needed, but the UI shows cm. Let's check db.ts format.
        bmi: 32.5,
        bodyFatPercentage: 39.6,
        fatMass: 33,
        leanMass: 50.3,
        residualMass: 17.4,
        waistToHipRatio: 0.76,
        cmb: 22.2,

        // Folds
        skinfoldTriceps: 28,
        skinfoldBiceps: 22,
        skinfoldSubscapular: 37,
        skinfoldSuprailiac: 35,

        // Circumferences
        circNeck: 35,
        circWaist: 80,
        circHip: 105,
        circAbdomen: 105,
        circArmRelaxed: 31,
        circForearm: 25,
        circThigh: 52,
        circCalf: 33.5
    };

    const patient = patients[jovIdx];
    if (!patient.anthropometryHistory) patient.anthropometryHistory = [];

    // Check if it already exists to avoid duplicates
    const exists = patient.anthropometryHistory.some(r => r.date.startsWith("2026-01-16"));

    if (!exists) {
        patient.anthropometryHistory.push(historicRecord);
        // Sort history
        patient.anthropometryHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        console.log("Added historic record for 16/01/2026");
    } else {
        console.log("Record for 16/01/2026 already exists, updating values...");
        const idx = patient.anthropometryHistory.findIndex(r => r.date.startsWith("2026-01-16"));
        patient.anthropometryHistory[idx] = { ...patient.anthropometryHistory[idx], ...historicRecord };
    }

    // Also update the main anthropometry if this is the newest (it's not, today is 04/03)
    // But let's verify if 'anthropometryHistory' is consistent.

    await setDoc(docRef, { ...data, lastModified: Date.now() });
    console.log("Successfully saved updated data to Firestore.");
}

addHistoricData().catch(console.error);
