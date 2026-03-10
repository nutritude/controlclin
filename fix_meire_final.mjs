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

async function run() {
    process.stdout.write("Buscando dados em system_data/global_v1...\n");
    const docRef = doc(db, "system_data", "global_v1");
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
        console.error("Dados globais não encontrados!");
        return;
    }

    const data = snap.data();

    // IDs Fixos
    const meireId = "pt_meire";
    const rangelId = "p3";

    // 1. Remover registro de antropometria: 24 de fevereiro de 2026 às 21:00
    if (data.anthropometry) {
        const initialCount = data.anthropometry.length;
        data.anthropometry = data.anthropometry.filter(a => {
            const isMeire = String(a.patientId) === meireId;
            const matchesData = a.weight === 72.6 && a.bodyFat === 39;
            const matchesDate = a.date && a.date.includes("2026-02-24T21:00");

            if (isMeire && matchesData) {
                process.stdout.write(`REGISTRO DELETADO: Antropometria Meire (24/02/2026 21:00).\n`);
                return false;
            }
            return true;
        });
        process.stdout.write(`Registros de antropometria processados: ${initialCount} -> ${data.anthropometry.length}\n`);
    }

    // 2. Localizar a última antropometria válida para datar o plano
    const anthroList = data.anthropometry || [];
    const meireAnthros = anthroList.filter(a => String(a.patientId) === meireId);

    let planDate = "2026-02-24T10:00:00"; // fallback
    if (meireAnthros.length > 0) {
        const sorted = meireAnthros.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        planDate = sorted[0].date;
    }

    // 3. Inserir Plano Alimentar Inegociável
    const newPlan = {
        id: "plan_meire_v2_" + Date.now(),
        patientId: meireId,
        professionalId: rangelId,
        date: planDate,
        title: "Plano Alimentar - Meire",
        status: "ACTIVE",
        calories: 1516,
        macros: { protein: 145, carbs: 70, fat: 73 },
        meals: [
            {
                name: "CAFÉ DA MANHÃ",
                time: "08:00",
                items: [
                    { name: "Cuscuz de milho, cozido com sal", amount: "150g", substitutes: ["1 unidade - Pão Francês", "1 Fatia (25g) - Pão integral", "2 Fatia (50g) - Pão de aveia"] },
                    { name: "Ovo de galinha cozido ou mexido", amount: "1 Unidade (50g)", substitutes: ["100g - Omelete", "1 Fatia média - Queijo minas", "1.5 Colher - Requeijão cremoso", "1 Fatia fina - Queijo mozarela"] },
                    { name: "Ameixa seca (batida com agua morne 300ml)", amount: "50g" },
                    { name: "Café expresso ou coado", amount: "200ml", substitutes: ["Copo - Chá mate", "Copo - Chá verde", "Copo - Chá preto"] }
                ]
            },
            {
                name: "LANCHE DA MANHÃ",
                time: "10:30",
                items: [
                    { name: "Whey Protein Concentrado (com agua 250ml ou café)", amount: "30g", substitutes: ["250g - Iogurte sem lactose", "1 Xícara - Leite fermentado"] },
                    { name: "Mamão Formosa, cru", amount: "200g", substitutes: ["200g - Melão", "100g - Pera", "100g - Laranja Pera"] }
                ]
            },
            {
                name: "ALMOÇO",
                time: "12:30",
                items: [
                    { name: "Arroz Branco Cozido", amount: "80g", substitutes: ["3 Colheres - Arroz integral", "100g - Batata inglesa", "300g - Abóbora cabotiá", "4 Colheres - Macarrão integral", "80g - Mandioca"] },
                    { name: "Feijão Carioca Cozido", amount: "60g", substitutes: ["45g - Lentilha", "3 Colheres - Feijão fradinho", "50g - Grão-de-bico", "100g - Vagem"] },
                    { name: "Seleta de legumes (escolha a gosto)", amount: "200g", substitutes: ["100g - Cenoura crua", "50g - Beterraba cozida", "100g - Couve-flor", "100g - Quiabo"] },
                    { name: "Salada de alface e tomate temperada com azeite e vinagre", amount: "150ml", substitutes: ["100g - Tomate salada", "100g - Pepino salada"] },
                    { name: "Peito de Frango Grelhado", amount: "120g", substitutes: ["1.5 Filé - Carne bovina (80g)", "Bife médio - Carne bovina sem gordura (100g)", "Filé médio - Porco pernil (80g)", "100g - Tilápia grelhada"] }
                ]
            },
            {
                name: "LANCHE DA TARDE",
                time: "16:00",
                items: [
                    { name: "Whey Protein Concentrado (agua 250ml ou café)", amount: "30g", substitutes: ["2 Unidades - Ovo cozido", "100g - Omelete (2 ovos)"] },
                    { name: "Overnight (qualquer combinação)", amount: "150g" }
                ]
            },
            {
                name: "JANTAR",
                time: "20:00",
                items: [
                    { name: "Arroz Branco Cozido", amount: "60g", substitutes: ["3 Colheres - Arroz integral", "100g - Batata inglesa", "300g - Abóbora cabotiá", "4 Colheres - Macarrão integral", "80g - Mandioca"] },
                    { name: "Feijão Carioca Cozido", amount: "60g", substitutes: ["45g - Lentilha", "3 Colheres - Feijão fradinho", "50g - Grão-de-bico", "100g - Vagem"] },
                    { name: "Seleta de legumes (escolha a gosto)", amount: "100g", substitutes: ["100g - Cenoura crua", "100g - Couve-flor", "100g - Quiabo"] },
                    { name: "Salada de alface e tomate temperada com azeite e vinagre", amount: "150ml", substitutes: ["100g - Tomate salada", "100g - Pepino salada"] },
                    { name: "Peito de Frango Grelhado", amount: "80g", substitutes: ["1.5 Filé - Carne bovina (80g)", "Bife médio - Carne bovina sem gordura (100g)"] }
                ]
            }
        ]
    };

    if (!data.prescriptions) data.prescriptions = [];
    // Limpar planos antigos da Meire
    data.prescriptions = data.prescriptions.filter(p => p.patientId !== meireId);
    data.prescriptions.push(newPlan);
    process.stdout.write("PLANO ALIMENTAR GRAVADO (Data Sincronizada: " + planDate + ").\n");

    // Salvar
    data.lastModified = Date.now();
    await setDoc(docRef, data);
    process.stdout.write("BANCO DE DADOS ATUALIZADO.\n");
}

run().catch(console.error);
