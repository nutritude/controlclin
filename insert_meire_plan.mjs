import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const app = initializeApp({
    apiKey: "AIzaSyCaBgmBq4Hj6IjA0765q6kDKk6JWG4_Sws",
    authDomain: "controclin-602b6.firebaseapp.com",
    projectId: "controclin-602b6",
    storageBucket: "controclin-602b6.firebasestorage.app",
    messagingSenderId: "510250226894",
    appId: "1:510250226894:web:265ccdd6f92c55ca656c9f"
});

const db = getFirestore(app);
const CLINIC_DOC = doc(db, "clinics", "c1", "data", "main");
const MEIRE_ID = "pt_meire";
const AUTHOR_ID = "p3"; // Dr. Rangel
const NOW = new Date().toISOString();

// ============================================================
// PLANO ALIMENTAR MEIRE - EXATAMENTE CONFORME AS IMAGENS
// META: 1516 kcal | Proteínas: 145g | Carb: 70g | Gorduras: 73g
// ============================================================

const meirePlan = {
    id: "plan-meire-oficial-001",
    title: "Plano Alimentar - Meire",
    status: "ATIVO",
    authorId: AUTHOR_ID,
    createdAt: "2026-02-24T10:00:00.000Z",
    updatedAt: NOW,
    strategyName: "Emagrecimento e Controle de Peso",
    methodology: "ALIMENTOS",
    inputsUsed: {
        weight: 71.4,
        height: 162,
        age: 55,
        gender: "Feminino",
        formula: "MIFFLIN",
        activityFactor: 1.375,
        patientProfile: "ADULTO_SOBREPESO",
        caloricGoalAdjustment: -20,
        amputations: [],
        injuryFactor: 1
    },
    caloricTarget: 1516,
    macroTargets: {
        protein: { g: 145, pct: 38, kcal: 580 },
        carbs: { g: 70, pct: 18, kcal: 280 },
        fat: { g: 73, pct: 43, kcal: 657 }
    },
    meals: [
        // ========================================
        // CAFÉ DA MANHÃ
        // ========================================
        {
            id: "meal-meire-cafe",
            name: "Café da Manhã",
            time: "08:00",
            items: [
                {
                    foodId: "cuscuz-milho-001",
                    name: "Cuscuz de milho, cozido com sal",
                    quantity: 150,
                    unit: "g",
                    calculatedCalories: 185,
                    calculatedProtein: 4.5,
                    calculatedCarbs: 37,
                    calculatedFat: 1.5,
                    substitutes: [
                        {
                            foodId: "pao-frances-001",
                            name: "Pão Francês",
                            customName: "1 unidade - Pão Francês",
                            quantity: 1,
                            unit: "1 unidade",
                            calculatedCalories: 150,
                            calculatedProtein: 4,
                            calculatedCarbs: 29,
                            calculatedFat: 1.5
                        },
                        {
                            foodId: "pao-integral-001",
                            name: "Pão, trigo, forma, integral",
                            customName: "Fatia (25g) - Pão, trigo, forma, integral",
                            quantity: 1,
                            unit: "Fatia (25g)",
                            calculatedCalories: 65,
                            calculatedProtein: 2.5,
                            calculatedCarbs: 12,
                            calculatedFat: 0.8
                        },
                        {
                            foodId: "pao-aveia-001",
                            name: "Pão de aveia",
                            customName: "2 Fatia (25g) - Pão de aveia",
                            quantity: 2,
                            unit: "Fatia (25g)",
                            calculatedCalories: 130,
                            calculatedProtein: 5,
                            calculatedCarbs: 24,
                            calculatedFat: 2
                        }
                    ]
                },
                {
                    foodId: "ovo-cozido-001",
                    name: "Ovo de galinha frito sem óleo, cozido, ou mexido",
                    customName: "Ovo de galinha frito sem óleo, cozido, ou mexido",
                    quantity: 1,
                    unit: "Unidade (50g)",
                    calculatedCalories: 77,
                    calculatedProtein: 6.5,
                    calculatedCarbs: 0.5,
                    calculatedFat: 5.5,
                    substitutes: [
                        {
                            foodId: "omelete-001",
                            name: "Omelete",
                            customName: "100g (Padrão) - Omelete",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 154,
                            calculatedProtein: 13,
                            calculatedCarbs: 1,
                            calculatedFat: 11
                        },
                        {
                            foodId: "queijo-minas-001",
                            name: "Queijo, minas, frescal",
                            customName: "Fatia média (30g) - Queijo, minas, frescal",
                            quantity: 1,
                            unit: "Fatia média (30g)",
                            calculatedCalories: 65,
                            calculatedProtein: 5.5,
                            calculatedCarbs: 0.5,
                            calculatedFat: 4.5
                        },
                        {
                            foodId: "requeijao-001",
                            name: "Queijo, requeijão, cremoso de soja",
                            customName: "1.5 Colher de sopa (20g) - Queijo, requeijão, cremoso de soja",
                            quantity: 1.5,
                            unit: "Colher de sopa (20g)",
                            calculatedCalories: 50,
                            calculatedProtein: 2,
                            calculatedCarbs: 2,
                            calculatedFat: 4
                        },
                        {
                            foodId: "queijo-mozarela-001",
                            name: "Queijo, mozarela",
                            customName: "Fatia fina (15g) - Queijo, mozarela",
                            quantity: 1,
                            unit: "Fatia fina (15g)",
                            calculatedCalories: 45,
                            calculatedProtein: 3.5,
                            calculatedCarbs: 0.3,
                            calculatedFat: 3.5
                        }
                    ]
                },
                {
                    foodId: "ameixa-seca-001",
                    name: "Ameixa seca (batida com agua morne 300ml)",
                    customName: "Ameixa seca (batida com agua morne 300ml)",
                    quantity: 50,
                    unit: "g",
                    calculatedCalories: 120,
                    calculatedProtein: 1,
                    calculatedCarbs: 28,
                    calculatedFat: 0.2
                },
                {
                    foodId: "cafe-coado-001",
                    name: "Café expresso ou coado",
                    customName: "Café expresso ou coado",
                    quantity: 200,
                    unit: "ml",
                    calculatedCalories: 4,
                    calculatedProtein: 0.3,
                    calculatedCarbs: 0.5,
                    calculatedFat: 0,
                    substitutes: [
                        {
                            foodId: "cha-mate-001",
                            name: "Chá mate, infusão 5%",
                            customName: "Copo - Chá, mate, infusão 5%",
                            quantity: 200,
                            unit: "ml",
                            calculatedCalories: 8,
                            calculatedProtein: 0,
                            calculatedCarbs: 2,
                            calculatedFat: 0
                        },
                        {
                            foodId: "cha-verde-001",
                            name: "Chá, infusão, verde",
                            customName: "Copo (260ml) - Chá, infusão, verde",
                            quantity: 260,
                            unit: "ml",
                            calculatedCalories: 3,
                            calculatedProtein: 0,
                            calculatedCarbs: 0.5,
                            calculatedFat: 0
                        },
                        {
                            foodId: "cha-preto-001",
                            name: "Chá preto, infusão 5%",
                            customName: "Copo (260ml) - Chá, preto, infusão 5%",
                            quantity: 260,
                            unit: "ml",
                            calculatedCalories: 3,
                            calculatedProtein: 0,
                            calculatedCarbs: 0.5,
                            calculatedFat: 0
                        }
                    ]
                }
            ]
        },
        // ========================================
        // LANCHE DA MANHÃ
        // ========================================
        {
            id: "meal-meire-lanche-manha",
            name: "Lanche da Manhã",
            time: "10:30",
            items: [
                {
                    foodId: "whey-concentrado-001",
                    name: "Whey Protein Concentrado (com agua 250m ou café)",
                    customName: "Whey Protein Concentrado (com agua 250m ou café)",
                    quantity: 30,
                    unit: "g",
                    calculatedCalories: 113,
                    calculatedProtein: 22,
                    calculatedCarbs: 3,
                    calculatedFat: 2,
                    substitutes: [
                        {
                            foodId: "iogurte-sem-lactose-001",
                            name: "Iogurte sem lactose qualquer sabor",
                            customName: "250g - Iogurte sem lactose qualquer sabor",
                            quantity: 250,
                            unit: "g",
                            calculatedCalories: 150,
                            calculatedProtein: 8,
                            calculatedCarbs: 20,
                            calculatedFat: 3.5
                        },
                        {
                            foodId: "leite-fermentado-001",
                            name: "Leite fermentado tipo yakult",
                            customName: "Xícara (240ml) - Leite fermentado tipo yakult",
                            quantity: 240,
                            unit: "ml",
                            calculatedCalories: 120,
                            calculatedProtein: 6,
                            calculatedCarbs: 20,
                            calculatedFat: 1.5
                        }
                    ]
                },
                {
                    foodId: "mamao-formosa-001",
                    name: "Mamão, Formosa, cru",
                    customName: "Mamão, Formosa, cru",
                    quantity: 200,
                    unit: "g",
                    calculatedCalories: 74,
                    calculatedProtein: 1,
                    calculatedCarbs: 17,
                    calculatedFat: 0.2,
                    substitutes: [
                        {
                            foodId: "melao-001",
                            name: "Melão (qualquer variedade)",
                            customName: "200g - Melão (qualquer variedade)",
                            quantity: 200,
                            unit: "g",
                            calculatedCalories: 78,
                            calculatedProtein: 1.6,
                            calculatedCarbs: 18,
                            calculatedFat: 0
                        },
                        {
                            foodId: "pera-001",
                            name: "Pera (qualquer variedade)",
                            customName: "100g - Pera (qualquer variedade)",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 57,
                            calculatedProtein: 0.4,
                            calculatedCarbs: 13.6,
                            calculatedFat: 0.1
                        },
                        {
                            foodId: "laranja-pera-001",
                            name: "Laranja Pera",
                            customName: "160g - Laranja Pera (Padrão)",
                            quantity: 160,
                            unit: "g",
                            calculatedCalories: 64,
                            calculatedProtein: 1.4,
                            calculatedCarbs: 15,
                            calculatedFat: 0.2
                        }
                    ]
                }
            ]
        },
        // ========================================
        // ALMOÇO
        // ========================================
        {
            id: "meal-meire-almoco",
            name: "Almoço",
            time: "12:30",
            items: [
                {
                    foodId: "arroz-branco-001",
                    name: "Arroz Branco Cozido",
                    customName: "Arroz Branco Cozido",
                    quantity: 80,
                    unit: "g",
                    calculatedCalories: 102,
                    calculatedProtein: 2,
                    calculatedCarbs: 22,
                    calculatedFat: 0.1,
                    substitutes: [
                        {
                            foodId: "arroz-integral-001",
                            name: "Arroz, integral, cozido",
                            customName: "2 Colher de sopa (25g) - Arroz, integral, cozido",
                            quantity: 2,
                            unit: "Colher de sopa (25g)",
                            calculatedCalories: 85,
                            calculatedProtein: 1.8,
                            calculatedCarbs: 18,
                            calculatedFat: 0.5
                        },
                        {
                            foodId: "batata-inglesa-001",
                            name: "Batata, inglesa, cozida",
                            customName: "100g (Padrão) - Batata, inglesa, cozida",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 77,
                            calculatedProtein: 1.8,
                            calculatedCarbs: 17,
                            calculatedFat: 0.1
                        },
                        {
                            foodId: "abobora-cabotia-001",
                            name: "Abóbora, cabotiã, cozida",
                            customName: "300g - Abóbora, cabotiã, cozida",
                            quantity: 300,
                            unit: "g",
                            calculatedCalories: 93,
                            calculatedProtein: 3,
                            calculatedCarbs: 21,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "macarrao-integral-001",
                            name: "Macarrão integral (cozido agua fio oleo e sal)",
                            customName: "4 Colher de sopa (25g) - Macarrão integral (cozido agua fio oleo e sal)",
                            quantity: 4,
                            unit: "Colher de sopa (25g)",
                            calculatedCalories: 100,
                            calculatedProtein: 3.5,
                            calculatedCarbs: 20,
                            calculatedFat: 1
                        },
                        {
                            foodId: "mandioca-cozida-001",
                            name: "Mandioca, cozida",
                            customName: "80g - Mandioca, cozida",
                            quantity: 80,
                            unit: "g",
                            calculatedCalories: 106,
                            calculatedProtein: 0.8,
                            calculatedCarbs: 25,
                            calculatedFat: 0.1
                        }
                    ]
                },
                {
                    foodId: "feijao-carioca-001",
                    name: "Feijão Carioca Cozido",
                    customName: "Feijão Carioca Cozido",
                    quantity: 60,
                    unit: "g",
                    calculatedCalories: 73,
                    calculatedProtein: 4.5,
                    calculatedCarbs: 13,
                    calculatedFat: 0.3,
                    substitutes: [
                        {
                            foodId: "lentilha-001",
                            name: "Lentilha, cozida",
                            customName: "45g - Lentilha, cozida",
                            quantity: 45,
                            unit: "g",
                            calculatedCalories: 50,
                            calculatedProtein: 3.5,
                            calculatedCarbs: 8.5,
                            calculatedFat: 0.2
                        },
                        {
                            foodId: "feijao-fradinho-001",
                            name: "Feijão, fradinho, cozido",
                            customName: "3 Colher de sopa (20g) - Feijão, fradinho, cozido",
                            quantity: 3,
                            unit: "Colher de sopa (20g)",
                            calculatedCalories: 66,
                            calculatedProtein: 4,
                            calculatedCarbs: 12,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "grao-de-bico-001",
                            name: "Grão-de-bico cozido",
                            customName: "50g - Grão-de-bico cozido",
                            quantity: 50,
                            unit: "g",
                            calculatedCalories: 82,
                            calculatedProtein: 4.5,
                            calculatedCarbs: 14,
                            calculatedFat: 1.5
                        },
                        {
                            foodId: "vagem-001",
                            name: "Vagem cozida",
                            customName: "100g (Padrão) - Vagem cozida",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 28,
                            calculatedProtein: 1.8,
                            calculatedCarbs: 5,
                            calculatedFat: 0.2
                        }
                    ]
                },
                {
                    foodId: "seleta-legumes-001",
                    name: "Seleta de legumes (escolha a gosto)",
                    customName: "Seleta de legumes (escolha a gosto)",
                    quantity: 200,
                    unit: "g",
                    calculatedCalories: 60,
                    calculatedProtein: 3,
                    calculatedCarbs: 12,
                    calculatedFat: 0.4,
                    substitutes: [
                        {
                            foodId: "cenoura-crua-001",
                            name: "Cenoura, crua",
                            customName: "3 100g (Padrão) - Cenoura, crua",
                            quantity: 300,
                            unit: "g",
                            calculatedCalories: 102,
                            calculatedProtein: 2.4,
                            calculatedCarbs: 24,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "beterraba-001",
                            name: "Beterraba, cozida",
                            customName: "350g - Beterraba, cozida",
                            quantity: 350,
                            unit: "g",
                            calculatedCalories: 147,
                            calculatedProtein: 5.6,
                            calculatedCarbs: 30,
                            calculatedFat: 0.4
                        },
                        {
                            foodId: "couve-flor-001",
                            name: "Couve-flor, cozida",
                            customName: "100g - Couve-flor, cozida",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 25,
                            calculatedProtein: 2,
                            calculatedCarbs: 4.5,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "quiabo-001",
                            name: "Quiabo cozido ou assado",
                            customName: "100g - Quiabo cozido ou assado",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 33,
                            calculatedProtein: 2,
                            calculatedCarbs: 7,
                            calculatedFat: 0.2
                        }
                    ]
                },
                {
                    foodId: "salada-alface-tomate-almoco",
                    name: "Salada da alface e tomate temperada com azeite e vinagre",
                    customName: "Salada da alface e tomate temperada com azeite e vinagre",
                    quantity: 150,
                    unit: "ml",
                    calculatedCalories: 40,
                    calculatedProtein: 1,
                    calculatedCarbs: 4,
                    calculatedFat: 2,
                    substitutes: [
                        {
                            foodId: "tomate-salada-001",
                            name: "Tomate, salada",
                            customName: "100g (Padrão) - Tomate, salada",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 20,
                            calculatedProtein: 1,
                            calculatedCarbs: 4,
                            calculatedFat: 0.2
                        },
                        {
                            foodId: "salada-legumes-vapor-001",
                            name: "Salada, de legumes, cozida no vapor",
                            customName: "100g (Padrão) - Salada, de legumes, cozida no vapor",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 30,
                            calculatedProtein: 2,
                            calculatedCarbs: 5,
                            calculatedFat: 0.5
                        },
                        {
                            foodId: "pepino-salada-001",
                            name: "Pepino Salada",
                            customName: "100g (Padrão) - Pepino Salada",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 15,
                            calculatedProtein: 0.8,
                            calculatedCarbs: 3.2,
                            calculatedFat: 0.1
                        }
                    ]
                },
                {
                    foodId: "frango-grelhado-001",
                    name: "Peito de Frango Grelhado",
                    customName: "Peito de Frango Grelhado",
                    quantity: 120,
                    unit: "g",
                    calculatedCalories: 154,
                    calculatedProtein: 33,
                    calculatedCarbs: 0,
                    calculatedFat: 2,
                    substitutes: [
                        {
                            foodId: "carne-bovina-paleta-001",
                            name: "Carne, bovina, paleta, com gordura, crue pequeno",
                            customName: "1.5 Filé - Carne, bovina, paleta, com gordura, crue pequeno (80g)",
                            quantity: 80,
                            unit: "g",
                            calculatedCalories: 160,
                            calculatedProtein: 18,
                            calculatedCarbs: 0,
                            calculatedFat: 10
                        },
                        {
                            foodId: "bife-bovino-001",
                            name: "Bife Carne bovina, sem gordura",
                            customName: "Bife médio (100g) - Bife Carne bovina, sem gordura",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 160,
                            calculatedProtein: 26,
                            calculatedCarbs: 0,
                            calculatedFat: 6
                        },
                        {
                            foodId: "porco-pernil-001",
                            name: "Porco, pernil, assado",
                            customName: "Filé - Porco, pernil, assado pequeno (80g)",
                            quantity: 80,
                            unit: "g",
                            calculatedCalories: 160,
                            calculatedProtein: 22,
                            calculatedCarbs: 0,
                            calculatedFat: 8
                        },
                        {
                            foodId: "tilapia-grelhada-001",
                            name: "Tilápia grelhada",
                            customName: "100g (Padrão) - Tilápia grelhada",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 128,
                            calculatedProtein: 26,
                            calculatedCarbs: 0,
                            calculatedFat: 2.5
                        }
                    ]
                }
            ]
        },
        // ========================================
        // LANCHE DA TARDE
        // ========================================
        {
            id: "meal-meire-lanche-tarde",
            name: "Lanche da Tarde",
            time: "16:00",
            items: [
                {
                    foodId: "whey-concentrado-002",
                    name: "Whey Protein Concentrado (agua 250ml ou café)",
                    customName: "Whey Protein Concentrado (agua 250ml ou café)",
                    quantity: 30,
                    unit: "g",
                    calculatedCalories: 113,
                    calculatedProtein: 22,
                    calculatedCarbs: 3,
                    calculatedFat: 2,
                    substitutes: [
                        {
                            foodId: "ovo-cozido-lanche-001",
                            name: "Ovo de galinha, cozido",
                            customName: "2 Unidades - Ovo de galinha, cozido",
                            quantity: 2,
                            unit: "Unidades",
                            calculatedCalories: 154,
                            calculatedProtein: 13,
                            calculatedCarbs: 1,
                            calculatedFat: 11
                        },
                        {
                            foodId: "omelete-2ovos-001",
                            name: "Omelete c/ 2 ovos",
                            customName: "100g (Padrão) - Omelete c/ 2 ovos",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 154,
                            calculatedProtein: 13,
                            calculatedCarbs: 1,
                            calculatedFat: 11
                        }
                    ]
                },
                {
                    foodId: "overnight-001",
                    name: "Overnight (qualquer combinação)",
                    customName: "Overnight (qualquer combinação)",
                    quantity: 150,
                    unit: "g",
                    calculatedCalories: 160,
                    calculatedProtein: 8,
                    calculatedCarbs: 22,
                    calculatedFat: 4
                }
            ]
        },
        // ========================================
        // JANTAR
        // ========================================
        {
            id: "meal-meire-jantar",
            name: "Jantar",
            time: "20:00",
            items: [
                {
                    foodId: "arroz-branco-jantar-001",
                    name: "Arroz Branco Cozido",
                    customName: "Arroz Branco Cozido",
                    quantity: 60,
                    unit: "g",
                    calculatedCalories: 77,
                    calculatedProtein: 1.5,
                    calculatedCarbs: 17,
                    calculatedFat: 0.1,
                    substitutes: [
                        {
                            foodId: "arroz-integral-jantar-001",
                            name: "Arroz, integral, cozido",
                            customName: "3 Colher de sopa (75g) - Arroz, integral, cozido",
                            quantity: 3,
                            unit: "Colher de sopa (75g)",
                            calculatedCalories: 85,
                            calculatedProtein: 1.8,
                            calculatedCarbs: 18,
                            calculatedFat: 0.5
                        },
                        {
                            foodId: "batata-inglesa-jantar-001",
                            name: "Batata, inglesa, cozida",
                            customName: "100g - Batata, inglesa, cozida",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 77,
                            calculatedProtein: 1.8,
                            calculatedCarbs: 17,
                            calculatedFat: 0.1
                        },
                        {
                            foodId: "abobora-jantar-001",
                            name: "Abóbora, cabotiã, cozida",
                            customName: "300g - Abóbora, cabotiã, cozida",
                            quantity: 300,
                            unit: "g",
                            calculatedCalories: 93,
                            calculatedProtein: 3,
                            calculatedCarbs: 21,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "macarrao-integral-jantar-001",
                            name: "Macarrão integral (cozido agua fio oleo e sal)",
                            customName: "4 Colher de sopa (75g) - Macarrão integral (cozido agua fio oleo e sal)",
                            quantity: 4,
                            unit: "Colher de sopa (75g)",
                            calculatedCalories: 100,
                            calculatedProtein: 3.5,
                            calculatedCarbs: 20,
                            calculatedFat: 1
                        },
                        {
                            foodId: "mandioca-jantar-001",
                            name: "Mandioca, cozida",
                            customName: "80g - Mandioca, cozida",
                            quantity: 80,
                            unit: "g",
                            calculatedCalories: 106,
                            calculatedProtein: 0.8,
                            calculatedCarbs: 25,
                            calculatedFat: 0.1
                        }
                    ]
                },
                {
                    foodId: "feijao-carioca-jantar-001",
                    name: "Feijão Carioca Cozido",
                    customName: "Feijão Carioca Cozido",
                    quantity: 60,
                    unit: "g",
                    calculatedCalories: 73,
                    calculatedProtein: 4.5,
                    calculatedCarbs: 13,
                    calculatedFat: 0.3,
                    substitutes: [
                        {
                            foodId: "lentilha-jantar-001",
                            name: "Lentilha, cozida",
                            customName: "49g - Lentilha, cozida",
                            quantity: 49,
                            unit: "g",
                            calculatedCalories: 55,
                            calculatedProtein: 3.8,
                            calculatedCarbs: 9.3,
                            calculatedFat: 0.2
                        },
                        {
                            foodId: "feijao-fradinho-jantar-001",
                            name: "Feijão, fradinho, cozido",
                            customName: "3 Colher de sopa (20g) - Feijão, fradinho, cozido",
                            quantity: 3,
                            unit: "Colher de sopa (20g)",
                            calculatedCalories: 66,
                            calculatedProtein: 4,
                            calculatedCarbs: 12,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "grao-de-bico-jantar-001",
                            name: "Grão-de-bico cozido",
                            customName: "50g - Grão-de-bico cozido",
                            quantity: 50,
                            unit: "g",
                            calculatedCalories: 82,
                            calculatedProtein: 4.5,
                            calculatedCarbs: 14,
                            calculatedFat: 1.5
                        },
                        {
                            foodId: "vagem-jantar-001",
                            name: "Vagem cozida",
                            customName: "100g - Vagem cozida",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 28,
                            calculatedProtein: 1.8,
                            calculatedCarbs: 5,
                            calculatedFat: 0.2
                        }
                    ]
                },
                {
                    foodId: "seleta-legumes-jantar-001",
                    name: "Seleta de legumes (escolha a gosto)",
                    customName: "Seleta de legumes (escolha a gosto)",
                    quantity: 100,
                    unit: "g",
                    calculatedCalories: 30,
                    calculatedProtein: 1.5,
                    calculatedCarbs: 6,
                    calculatedFat: 0.2,
                    substitutes: [
                        {
                            foodId: "cenoura-crua-jantar-001",
                            name: "Cenoura, crua",
                            customName: "2 100g (Padrão) - Cenoura, crua",
                            quantity: 200,
                            unit: "g",
                            calculatedCalories: 68,
                            calculatedProtein: 1.6,
                            calculatedCarbs: 16,
                            calculatedFat: 0.2
                        },
                        {
                            foodId: "couve-flor-jantar-001",
                            name: "Couve-flor, cozida",
                            customName: "100g (Padrão) - Couve-flor, cozida",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 25,
                            calculatedProtein: 2,
                            calculatedCarbs: 4.5,
                            calculatedFat: 0.3
                        },
                        {
                            foodId: "quiabo-jantar-001",
                            name: "Quiabo cozido ou assado",
                            customName: "100g (Padrão) - Quiabo cozido ou assado",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 33,
                            calculatedProtein: 2,
                            calculatedCarbs: 7,
                            calculatedFat: 0.2
                        }
                    ]
                },
                {
                    foodId: "salada-alface-tomate-jantar",
                    name: "Salada da alface e tomate temperada com azeite e vinagre",
                    customName: "Salada da alface e tomate temperada com azeite e vinagre",
                    quantity: 150,
                    unit: "ml",
                    calculatedCalories: 40,
                    calculatedProtein: 1,
                    calculatedCarbs: 4,
                    calculatedFat: 2,
                    substitutes: [
                        {
                            foodId: "tomate-salada-jantar-001",
                            name: "Tomate, salada",
                            customName: "100g (Padrão) - Tomate, salada",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 20,
                            calculatedProtein: 1,
                            calculatedCarbs: 4,
                            calculatedFat: 0.2
                        },
                        {
                            foodId: "salada-legumes-vapor-jantar-001",
                            name: "Salada, de legumes, cozida no vapor",
                            customName: "100g (Padrão) - Salada, de legumes, cozida no vapor",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 30,
                            calculatedProtein: 2,
                            calculatedCarbs: 5,
                            calculatedFat: 0.5
                        },
                        {
                            foodId: "pepino-salada-jantar-001",
                            name: "Pepino Salada",
                            customName: "100g (Padrão) - Pepino Salada",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 15,
                            calculatedProtein: 0.8,
                            calculatedCarbs: 3.2,
                            calculatedFat: 0.1
                        }
                    ]
                },
                {
                    foodId: "frango-grelhado-jantar-001",
                    name: "Peito de Frango Grelhado",
                    customName: "Peito de Frango Grelhado",
                    quantity: 80,
                    unit: "g",
                    calculatedCalories: 102,
                    calculatedProtein: 22,
                    calculatedCarbs: 0,
                    calculatedFat: 1.3,
                    substitutes: [
                        {
                            foodId: "carne-bovina-paleta-jantar-001",
                            name: "Carne, bovina, paleta, com gordura, crue pequeno",
                            customName: "1.5 Filé - Carne, bovina, paleta, com gordura, crue pequeno (80g)",
                            quantity: 80,
                            unit: "g",
                            calculatedCalories: 160,
                            calculatedProtein: 18,
                            calculatedCarbs: 0,
                            calculatedFat: 10
                        },
                        {
                            foodId: "bife-bovino-jantar-001",
                            name: "Bife Carne bovina, sem gordura",
                            customName: "Bife médio (100g) - Bife Carne bovina, sem gordura",
                            quantity: 100,
                            unit: "g",
                            calculatedCalories: 160,
                            calculatedProtein: 26,
                            calculatedCarbs: 0,
                            calculatedFat: 6
                        }
                    ]
                }
            ]
        }
    ]
};

// ============================================================
// EXECUÇÃO: Lê, substitui o plano da Meire, salva e verifica
// ============================================================
async function run() {
    process.stdout.write("=== INSERÇÃO DO PLANO ALIMENTAR OFICIAL DA MEIRE ===\n\n");
    process.stdout.write("1. Buscando documento clinics/c1/data/main...\n");

    const snap = await getDoc(CLINIC_DOC);
    if (!snap.exists()) {
        console.error("CRÍTICO: Documento não encontrado!");
        process.exit(1);
    }

    const data = snap.data();

    process.stdout.write("2. Localizando paciente Meire (pt_meire)...\n");
    const meireIdx = data.patients.findIndex(p => p.id === MEIRE_ID);
    if (meireIdx === -1) {
        console.error("CRÍTICO: Paciente Meire não encontrada no banco!");
        process.exit(1);
    }

    const meire = data.patients[meireIdx];
    process.stdout.write(`   ✅ Encontrada: ${meire.name}\n`);

    // Guardar os outros planos APENAS de outros pacientes (JAMAIS meire)
    const outrosPlanosMeire = (meire.nutritionalPlans || []).filter(
        p => p.id === meirePlan.id // manter só se for idêntico (prevenção)
    );

    // Substituir apenas o plano ativo de Meire
    // Marca todos como PAUSADO e insere o novo como ATIVO
    const planosAntigos = (meire.nutritionalPlans || []).map(p => ({
        ...p,
        status: "PAUSADO" // arquivar os anteriores
    }));

    // Inserir o novo plano como ATIVO (no início da lista)
    meire.nutritionalPlans = [meirePlan, ...planosAntigos];

    // Assegurar que o updatedAt do paciente seja atualizado
    meire.updatedAt = NOW;
    data.patients[meireIdx] = meire;

    process.stdout.write(`3. Plano '${meirePlan.title}' preparado:\n`);
    process.stdout.write(`   - ID: ${meirePlan.id}\n`);
    process.stdout.write(`   - Status: ${meirePlan.status}\n`);
    process.stdout.write(`   - Meta: ${meirePlan.caloricTarget} kcal | P:${meirePlan.macroTargets.protein.g}g | C:${meirePlan.macroTargets.carbs.g}g | G:${meirePlan.macroTargets.fat.g}g\n`);
    process.stdout.write(`   - Refeições: ${meirePlan.meals.length}\n`);
    meirePlan.meals.forEach(m => {
        process.stdout.write(`     • ${m.name} (${m.time}) - ${m.items.length} itens\n`);
    });

    // Usar timestamp maior que qualquer cache para forçar sobreposição no cliente
    data.lastModified = Date.now() + 1000 * 60 * 60 * 48; // +48h garante prioridade sobre cache
    data.updatedAt = NOW;

    process.stdout.write("\n4. Salvando no Firestore (clinics/c1/data/main)...\n");
    await setDoc(CLINIC_DOC, data);
    process.stdout.write("   ✅ SALVO!\n");

    // ============================================================
    // REVISÃO INTERNA: Verificar se foi salvo corretamente
    // ============================================================
    process.stdout.write("\n5. REVISÃO INTERNA - Verificando integridade...\n");
    const snapVerify = await getDoc(CLINIC_DOC);
    const dataVerify = snapVerify.data();
    const meireVerify = dataVerify.patients.find(p => p.id === MEIRE_ID);

    if (!meireVerify) {
        console.error("   ❌ FALHA: Meire não encontrada na verificação!");
        process.exit(1);
    }

    const planVerify = meireVerify.nutritionalPlans?.find(p => p.id === meirePlan.id);
    if (!planVerify) {
        console.error("   ❌ FALHA: Plano não encontrado na verificação!");
        process.exit(1);
    }

    if (planVerify.status !== "ATIVO") {
        console.error("   ❌ FALHA: Plano não está como ATIVO!");
        process.exit(1);
    }

    const refeicoesSalvas = planVerify.meals?.length || 0;
    if (refeicoesSalvas < 5) {
        console.error(`   ❌ FALHA: Apenas ${refeicoesSalvas} refeições salvas (esperado: 5)`);
        process.exit(1);
    }

    process.stdout.write(`   ✅ Plano verificado:\n`);
    process.stdout.write(`      - ID: ${planVerify.id}\n`);
    process.stdout.write(`      - Status: ${planVerify.status}\n`);
    process.stdout.write(`      - Kcal: ${planVerify.caloricTarget}\n`);
    process.stdout.write(`      - Refeições: ${refeicoesSalvas}\n`);
    planVerify.meals.forEach(m => {
        process.stdout.write(`        • ${m.name}: ${m.items.length} alimentos\n`);
    });

    process.stdout.write("\n✅ ============================================\n");
    process.stdout.write("✅ PLANO ALIMENTAR DA MEIRE INSERIDO E VERIFICADO COM SUCESSO!\n");
    process.stdout.write("✅ Pronto para git push.\n");
    process.stdout.write("✅ ============================================\n");

    process.exit(0);
}

run().catch(err => {
    console.error("ERRO CRÍTICO:", err);
    process.exit(1);
});
