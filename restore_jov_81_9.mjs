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

async function injectLostData() {
    const c1Ref = doc(db, "clinics", "c1", "data", "main");
    const snap = await getDoc(c1Ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const jIdx = data.patients.findIndex(p => p.id === 'pt-1772617932879' || p.name.includes("Joventina"));

    if (jIdx > -1) {
        const j = data.patients[jIdx];

        if (!j.anthropometryHistory) j.anthropometryHistory = [];

        // Check if 81.9 already exists to prevent duplicate
        if (!j.anthropometryHistory.some(a => a.weight === 81.9)) {
            const novaAnthro = {
                date: new Date().toISOString(), // Ou colocar a data real da consulta se eu souber.
                weight: 81.9,
                height: j.anthropometry?.height || 1.60, // Reaproveita altura
                skinfoldProtocol: 'JacksonPollock7',
                // Coloco só o básico, o resto terão que preencher.
            };
            j.anthropometryHistory.push(novaAnthro);
            j.anthropometry = novaAnthro; // Update current
            console.log("Injetado Anthropo 81.9kg");
        }

        if (!j.clinicalSummary) j.clinicalSummary = {};
        if (!j.clinicalSummary.psychobehavioral) {
            console.log("Iniciando estrutura MIPAN.");
            j.clinicalSummary.psychobehavioral = {
                date: new Date().toISOString(),
                score: 0,
                riskLevel: 'Risco Nutricional Baixo',
                answers: {}
            };
        }

        data.lastModified = Date.now();
        await setDoc(c1Ref, data);
        console.log("Restaurado peso de 81.9kg para a Joventina.");
    }
}
injectLostData().catch(console.error);
