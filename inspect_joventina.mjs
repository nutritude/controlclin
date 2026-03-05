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

async function inspectJoventina() {
    const docRef = doc(db, "clinics", "c1", "data", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        const jov = data.patients.find(p => p.id === 'pt-1772617932879');
        if (jov) {
            console.log("Joventina Name:", jov.name);
            console.log("Anthropometry History:", JSON.stringify(jov.anthropometryHistory, null, 2));
            console.log("Current Anthropometry:", JSON.stringify(jov.anthropometry, null, 2));
        } else {
            console.log("Joventina not found");
        }
    }
}

inspectJoventina().catch(console.error);
