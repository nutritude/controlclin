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

async function findJoventinaMissingData() {
    console.log("Searching for Joventina's missing data...");

    // Check possible locations where the data might have been orphaned or moved
    const paths = [
        "clinics/c1/data/main",
        "clinics/c1/data/backup",
        "system_data/global_v1",
        "system_data/main"
    ];

    for (const path of paths) {
        try {
            const parts = path.split('/');
            let snap;
            if (parts.length === 4) snap = await getDoc(doc(db, parts[0], parts[1], parts[2], parts[3]));
            else snap = await getDoc(doc(db, parts[0], parts[1]));

            if (snap.exists()) {
                const data = snap.data();
                const joventinas = data.patients?.filter(p => p.name.includes("Joventina"));

                if (joventinas && joventinas.length > 0) {
                    joventinas.forEach(j => {
                        console.log(`\n--- Found Joventina in ${path} (ID: ${j.id}) ---`);
                        console.log(`Anthropometry forms count: ${j.anthropometryHistory?.length || 0}`);
                        if (j.anthropometryHistory?.length > 0) {
                            j.anthropometryHistory.forEach((a, i) => console.log(`  [${i}] Date: ${a.date}, Weight: ${a.weight}`));
                        }

                        console.log(`MIPAN profile: ${j.clinicalSummary?.psychobehavioral ? 'YES' : 'NO'}`);
                        if (j.clinicalSummary?.psychobehavioral) {
                            console.log(`  Profile Details: ${JSON.stringify(j.clinicalSummary.psychobehavioral).substring(0, 100)}...`);
                        }
                    });
                }

                // Also check loose assessments array
                const assessments = data.mipanAssessments?.filter(m => m.patientId === 'pt-1772617932879' || m.patientName?.includes("Joventina"));
                if (assessments && assessments.length > 0) {
                    console.log(`Found ${assessments.length} loose MIPAN assessments in ${path}`);
                    console.log(`Details: ${JSON.stringify(assessments).substring(0, 150)}...`);
                }
            }
        } catch (e) { }
    }
}

findJoventinaMissingData().catch(console.error);
