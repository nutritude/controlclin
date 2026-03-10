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

const CLINIC_DOC_REF = doc(db, "clinics", "c1", "data", "main");
const MEIRE_ID = "pt_meire";

async function run() {
    process.stdout.write("Buscando dados em clinics/c1/data/main...\n");
    const snap = await getDoc(CLINIC_DOC_REF);

    if (!snap.exists()) {
        console.error("Documento não encontrado!");
        return;
    }

    const data = snap.data();

    // Mostrar TODOS os registros da Meire antes de qualquer modificação
    for (const p of (data.patients || [])) {
        if (p.id !== MEIRE_ID) continue;
        process.stdout.write(`\nRegistros de ${p.name}:\n`);
        (p.anthropometryHistory || []).forEach(h => {
            process.stdout.write(`  - data: ${h.date} | peso: ${h.weight}kg | gordura: ${h.bodyFatPercentage || 'N/A'}%\n`);
        });
    }

    // =====================================================
    // REMOVER: 2026-02-24T10:00 (peso 71.4kg), 
    //          2026-02-25 (possivelmente também duplicata)
    // MANTER: Apenas os históricos listados na UI como válidos
    //   - 06/out/2025: 78.3kg
    //   - 07/nov/2025: 77.3kg
    //   - 03/dez/2025: 74.65kg
    //   - 09/jan/2026: 72.2kg
    //   - 13/fev/2026: 72.6kg (gordura 33.2%)
    //   - 24/fev/2026 às 10:00: 71.4kg (válido - MANTER)
    // NÃO MANTER:
    //   - 24/fev/2026 às 21:00: 72.6kg gordura 39% (INVÁLIDO)
    //   - 25/fev/2026: possivelmente inválido também
    // =====================================================

    let modified = false;

    for (const p of (data.patients || [])) {
        if (p.id !== MEIRE_ID) continue;

        const before = (p.anthropometryHistory || []).length;

        // Filtrar removendo APENAS o registro específico (21:00, 72.6kg)
        p.anthropometryHistory = (p.anthropometryHistory || []).filter(h => {
            // Remove registros com data que inclua "21:00" E peso 72.6
            const dateHas2100 =
                h.date.includes("T21:00") ||
                h.date.includes("21:00:00") ||
                h.date === "2026-02-24T21:00";

            const isTargetRecord = dateHas2100 && Number(h.weight) === 72.6;

            if (isTargetRecord) {
                process.stdout.write(`\n  🗑️  REMOVENDO: ${h.date} | ${h.weight}kg\n`);
                return false;
            }
            return true;
        });

        // Também remover "2026-02-25" se tiver gordura 39%
        p.anthropometryHistory = p.anthropometryHistory.filter(h => {
            const is0225 = h.date && h.date.startsWith("2026-02-25");
            const hasHighFat = Number(h.bodyFatPercentage) === 39;

            if (is0225 && hasHighFat) {
                process.stdout.write(`  🗑️  REMOVENDO (suspeito): ${h.date} | gordura ${h.bodyFatPercentage}%\n`);
                return false;
            }
            return true;
        });

        const after = p.anthropometryHistory.length;

        if (after !== before) {
            modified = true;

            // Actualizar snapshot do paciente com o mais recente
            const sorted = [...p.anthropometryHistory].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            if (sorted.length > 0) {
                p.anthropometry = { ...sorted[0] };
            }

            process.stdout.write(`\n  ✅ Meire: ${before} → ${after} registros\n`);
            process.stdout.write(`  ✅ Snapshot: ${sorted[0]?.date} (${sorted[0]?.weight}kg)\n`);
        }
    }

    // Usar timestamp futuro (maior que localStorage) para forçar sobreposição
    // Isso faz com que o app prefira o dado da nuvem quando sincronizar
    const futureTimestamp = Date.now() + 1000 * 60 * 60 * 24; // +24h
    data.lastModified = futureTimestamp;
    data.updatedAt = new Date().toISOString();

    await setDoc(CLINIC_DOC_REF, data);
    process.stdout.write("\n✅ BANCO ATUALIZADO! (lastModified ajustado para forçar sobreposição do cache)\n");
}

run().catch(console.error);
