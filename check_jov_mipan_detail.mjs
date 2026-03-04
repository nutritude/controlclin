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

async function checkJovMipan() {
    const snap = await getDoc(doc(db, "clinics", "c1", "data", "main"));
    if (snap.exists()) {
        const data = snap.data();
        const p = data.patients?.find(x => x.id === 'pt-1772617932879' || x.name?.includes('Joventina'));

        console.log("Joventina Name:", p?.name);
        if (p?.clinicalSummary?.psychobehavioral) {
            console.log("MIPAN inside Patient object:", JSON.stringify(p.clinicalSummary.psychobehavioral, null, 2));
        } else {
            console.log("No MIPAN inside Patient object.");
        }

        const looseMipan = data.mipanAssessments?.filter(x => x.patientId === 'pt-1772617932879');
        console.log("Loose MIPAN arrays:", JSON.stringify(looseMipan, null, 2));
    }
}
checkJovMipan().catch(console.error);
