import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs, doc, setDoc } from "firebase/firestore";

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

async function checkOldDocsForJoventina() {
    console.log("Checking history in global_v1...");
    // The data might have been in global_v1 before I made the changes.
    // Let's check exactly global_v1's contents
    try {
        const snap = await getDocs(collectionGroup(db, "data"));
        snap.forEach(d => {
            const ds = JSON.stringify(d.data());
            if (ds.includes("1772617932879") && ds.includes("81.9")) {
                console.log("FOUND JOVENTINA + 81.9 IN", d.ref.path);
            }
            if (ds.includes("1772617932879") && ds.includes("mipan")) {
                console.log("FOUND JOVENTINA + MIPAN IN", d.ref.path);
            }
        });
    } catch (e) { }
}

checkOldDocsForJoventina().catch(console.error);
