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

async function findLooseData() {
    let target = null;
    let targetMipan = null;

    // We already know it's missing in c1/data/main. 
    // What if it's in a backup? Wait, the user said "aqui na restauraçao só voltou a primeira".
    // That means the state I restored from (which was the local cache or the DB state from the dump) 
    // was an older version before they actually saved the 81.9kg entry.
    // Let's check when the last modified date was.
    const paths = [
        "system_data/DKLN4GKXCljQlvw4WKgO",
        "clinics/c1/data/backup",
        "clinics/control/data/main",
        "clinics/nutritude/data/main"
    ];

    for (const p of paths) {
        const parts = p.split('/');
        let snap;
        try {
            if (parts.length === 2) snap = await getDoc(doc(db, parts[0], parts[1]));
            else snap = await getDoc(doc(db, parts[0], parts[1], parts[2], parts[3]));

            if (snap && snap.exists()) {
                const data = snap.data();
                const str = JSON.stringify(data);
                if (str.includes("81.9")) console.log(`FOUND 81.9 in ${p}`);
                if (str.includes("mipan")) console.log(`FOUND MIPAN in ${p}`);
            }
        } catch (e) { }
    }
}
findLooseData().catch(console.error);
