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

async function findJoventina() {
    console.log("Searching EVERY doc in database for Joventina's 81.9kg entry...");
    const snap = await getDocs(collectionGroup(db, "data"));
    let foundAnthro = null;
    let foundSummary = null;

    snap.forEach(d => {
        const data = d.data();
        const str = JSON.stringify(data);
        if (str.includes("81.9") || str.includes("81,9")) {
            console.log(`\n!!! FOUND 81.9 in document: ${d.ref.path} !!!`);
            const p = data.patients?.find(pat => JSON.stringify(pat).includes("81.9") || JSON.stringify(pat).includes("81,9"));
            if (p) {
                console.log(`Located patient: ${p.name}`);
                foundAnthro = p.anthropometryHistory;
                foundSummary = p.clinicalSummary;
            }
        }
    });

    if (foundAnthro) {
        // We found the missing data, let's restore it to clinic c1
        console.log("Attempting restoration of Joventina's data into 'c1/data/main'...");
        const c1Ref = doc(db, "clinics", "c1", "data", "main");
        const c1Snap = await getDoc(c1Ref);

        if (c1Snap.exists()) {
            const c1data = c1Snap.data();
            const jovIdx = c1data.patients?.findIndex(p => p.id === 'pt-1772617932879' || p.name.includes("Joventina"));

            if (jovIdx > -1) {
                // Restore only if found data is larger than current
                if (foundAnthro.length > (c1data.patients[jovIdx].anthropometryHistory?.length || 0)) {
                    console.log("Restoring Anthropometry History array...");
                    c1data.patients[jovIdx].anthropometryHistory = foundAnthro;

                    // Also update the main anthropometry object to the last one
                    c1data.patients[jovIdx].anthropometry = foundAnthro[foundAnthro.length - 1];
                }

                if (foundSummary?.psychobehavioral) {
                    console.log("Restoring MIPAN psychobehavioral profile...");
                    if (!c1data.patients[jovIdx].clinicalSummary) c1data.patients[jovIdx].clinicalSummary = {};
                    c1data.patients[jovIdx].clinicalSummary.psychobehavioral = foundSummary.psychobehavioral;
                }

                c1data.lastModified = Date.now();
                await setDoc(c1Ref, c1data);
                console.log("✅ Joventina's data successfully restored to c1.");
            } else {
                console.warn("Joventina not found in current c1 to attach data to.");
            }
        }
    } else {
        console.log("❌ Could not find the 81.9kg entry anywhere in the database.");
    }
}

findJoventina().catch(console.error);
