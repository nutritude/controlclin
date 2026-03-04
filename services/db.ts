import { NutrientCalc } from './food/nutrientCalc'; // Import NutrientCalc for deterministic totals
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
    User, Clinic, Professional, Patient, Appointment,
    Role, AppointmentStatus, Exam, AuditLog, ExamMarker, ExamAnalysisResult,
    TimelineEvent, TimelineEventType, ClinicalNote, FinancialTransaction, AIConfig,
    ClinicalAlert, AlertType, AlertSeverity, Anthropometry, FoodItem, NutritionalPlan, Meal,
    PlanSnapshot, AnthroSnapshot, PatientEvent, IndividualReportSnapshot, FinancialInfo,
    ExamRequest, MipanAssessment, Prescription, PrescriptionItem, AdherenceCheckIn
} from '../types';
import { db as firestore, auth, firebaseConfig } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { saasService } from './saasService';

// --- CONFIGURATION CONSTANTS (Single Source of Truth) ---
export const CIRCUMFERENCES_CONFIG: { key: keyof Anthropometry; label: string }[] = [
    { key: 'circNeck', label: 'Pescoço' },
    { key: 'circChest', label: 'Tórax' },
    { key: 'circWaist', label: 'Cintura' },
    { key: 'circAbdomen', label: 'Abdômen' },
    { key: 'circHip', label: 'Quadril' },
    { key: 'circArmContracted', label: 'Braço Contraído' },
    { key: 'circThigh', label: 'Coxa' },
    { key: 'circCalf', label: 'Panturrilha' }
];

export const SKINFOLDS_CONFIG: { key: keyof Anthropometry; label: string }[] = [
    { key: 'skinfoldChest', label: 'Peitoral' },
    { key: 'skinfoldAxillary', label: 'Axilar Média' },
    { key: 'skinfoldTriceps', label: 'Tríceps' },
    { key: 'skinfoldSubscapular', label: 'Subescapular' },
    { key: 'skinfoldAbdominal', label: 'Abdominal' },
    { key: 'skinfoldSuprailiac', label: 'Supra-ilíaca' },
    { key: 'skinfoldThigh', label: 'Coxa' }
];

// --- MOCK FOOD DATABASE ---
// (Kept shorter for brevity, assuming full list in real implementation)
const MOCK_FOOD_DB: FoodItem[] = [
    { id: 'f1', name: 'Arroz Branco Cozido', category: 'Cereais', calories: 128, protein: 2.5, carbs: 28.1, fat: 0.2, fiber: 1.6, sodium: 1, standardPortion: 150, householdMeasure: '1 escumadeira', unit: 'g' },
    // ... (Other items implied)
];

// --- INITIAL MOCK DATA (RESET V8 - STABLE) ---
// (Mock data setup omitted for brevity to focus on logic changes, assume same structure as original)
const DEFAULT_CLINICS: Clinic[] = [
    {
        id: 'c1',
        name: 'ControlClin Excellence',
        slug: 'control',
        isActive: true,
        primaryColor: '#7c3aed',
        aiConfig: { personality: 'ANALITICA', focus: 'FATURAMENTO' },
        scheduleConfig: { openTime: '08:00', closeTime: '18:00', daysOpen: [1, 2, 3, 4, 5], slotDuration: 30 }
    }
];
const DEFAULT_USERS: User[] = [
    { id: 'u-root', clinicId: 'c1', name: 'Super Admin', email: 'root@control.com', role: Role.SUPER_ADMIN, password: '123' },
    { id: 'u-rangel', clinicId: 'c1', name: 'Dr. Rangel', email: 'rangel@control.com', role: Role.CLINIC_ADMIN, professionalId: 'p3', password: '123' },
    { id: 'u-marcella', clinicId: 'c1', name: 'Dra. Marcella', email: 'marcella@control.com', role: Role.CLINIC_ADMIN, professionalId: 'p2', password: '123' },
    { id: 'u-debora', clinicId: 'c1', name: 'Dra. Debora', email: 'debora@control.com', role: Role.CLINIC_ADMIN, professionalId: 'p-debora', password: '123' },
    { id: 'u-matheus', clinicId: 'c1', name: 'Dr. Matheus', email: 'matheus@control.com', role: Role.CLINIC_ADMIN, professionalId: 'p-matheus', password: '123' },
];
const DEFAULT_PROFESSIONALS: Professional[] = [
    { id: 'p3', clinicId: 'c1', userId: 'u-rangel', name: 'Dr. Rangel', email: 'rangel@control.com', phone: '', specialty: 'Dermatologia', registrationNumber: 'CRM', color: 'bg-blue-200', isActive: true },
    { id: 'p2', clinicId: 'c1', userId: 'u-marcella', name: 'Dra. Marcella', email: 'marcella@control.com', phone: '', specialty: 'Nutrição', registrationNumber: 'CRN', color: 'bg-green-200', isActive: true },
    { id: 'p-debora', clinicId: 'c1', userId: 'u-debora', name: 'Dra. Debora', email: 'debora@control.com', phone: '', specialty: 'Nutrição', registrationNumber: 'CRN', color: 'bg-purple-200', isActive: true },
    { id: 'p-matheus', clinicId: 'c1', userId: 'u-matheus', name: 'Dr. Matheus', email: 'matheus@control.com', phone: '', specialty: 'Médico', registrationNumber: 'CRM', color: 'bg-indigo-200', isActive: true },
];

const DEFAULT_PLAN_PT1: NutritionalPlan = {
    id: 'plan-pt1-v1',
    title: 'Novo Plano - Estratégia Inicial',
    status: 'ATIVO',
    authorId: 'p3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    strategyName: 'Emagrecimento e Controle Glicêmico',
    methodology: 'ALIMENTOS',
    inputsUsed: {
        weight: 102,
        height: 1.70,
        age: 72,
        gender: 'Masculino',
        formula: 'HARRIS',
        activityFactor: 1.55,
        patientProfile: 'ADULTO_SOBREPESO'
    },
    caloricTarget: 2405,
    macroTargets: {
        protein: { g: 200, pct: 33 },
        carbs: { g: 176, pct: 29 },
        fat: { g: 100, pct: 37 }
    },
    meals: [
        {
            id: 'meal-1',
            name: 'Café da Manhã',
            time: '08:00',
            items: [
                { foodId: 'f-legacy-1', name: 'Queijo branco', quantity: 50, unit: 'g', calculatedCalories: 132, calculatedProtein: 8, calculatedCarbs: 1, calculatedFat: 10 },
                { foodId: 'f-legacy-2', name: 'Café expresso', quantity: 80, unit: 'ml', calculatedCalories: 2, calculatedProtein: 0, calculatedCarbs: 0.5, calculatedFat: 0 },
                { foodId: 'f-legacy-3', name: 'Ovo de galinha frito', quantity: 60, unit: 'g', calculatedCalories: 110, calculatedProtein: 7, calculatedCarbs: 0.5, calculatedFat: 9 }
            ]
        },
        {
            id: 'meal-2',
            name: 'Lanche da Manhã',
            time: '10:30',
            items: [
                { foodId: 'f-legacy-4', name: 'Iogurte natural desnatado', quantity: 170, unit: 'g', calculatedCalories: 70, calculatedProtein: 6, calculatedCarbs: 10, calculatedFat: 0 },
                { foodId: 'f-legacy-5', name: 'Flocos de aveia', quantity: 40, unit: 'g', calculatedCalories: 157, calculatedProtein: 6, calculatedCarbs: 23, calculatedFat: 3 }
            ]
        }
    ]
};
const DEFAULT_PATIENTS: Patient[] = [
    {
        id: 'pt1',
        clinicId: 'c1',
        name: 'Sr. Antônio Carlos',
        email: 'antonio@email.com',
        password: '123',
        phone: '111',
        birthDate: '1953-05-20',
        gender: 'Masculino',
        status: 'ATIVO',
        clinicalSummary: {
            clinicalGoal: 'Emagrecimento',
            activeDiagnoses: ['Diabetes Mellitus 2', 'HAS', 'DPOC']
        },
        anthropometry: {
            weight: 102,
            height: 1.70,
            bmi: 35.3,
            bodyFatPercentage: 33.6,
            leanMass: 67.7,
            fatMass: 34.3,
            circNeck: 40,
            circChest: 103,
            circWaist: 100,
            circAbdomen: 102,
            circHip: 105,
            circArmContracted: 35,
            circThigh: 45,
            circCalf: 33,
            waistToHipRatio: 0.97
        },
        financial: {
            mode: 'PARTICULAR',
            transactions: [
                { id: 't-ac-1', date: '2026-02-15T10:00:00Z', amount: 350, originalAmount: 350, method: 'PIX', status: 'PAGO', description: 'Avaliação Inicial Premium' },
                { id: 't-ac-2', date: '2026-03-02T14:00:00Z', amount: 200, originalAmount: 250, method: 'CARTAO_CREDITO', status: 'PAGO', description: 'Sessão de Bioimpedância (D) ' },
                { id: 't-ac-3', date: '2026-03-10T09:00:00Z', amount: 350, originalAmount: 350, method: 'PIX', status: 'PENDENTE', description: 'Acompanhamento Mensal' }
            ]
        },
        nutritionalPlans: [DEFAULT_PLAN_PT1],
        adherenceHistory: [
            { id: 'ad-1', date: '2026-03-01T10:00:00Z', day: '2026-03-01', status: 'TOTAL', mealsAdhered: ['m-1', 'm-2', 'm-3', 'm-4'], waterIntakeLiters: 2.5 },
            { id: 'ad-2', date: '2026-03-02T10:00:00Z', day: '2026-03-02', status: 'PARCIAL', mealsAdhered: ['m-1', 'm-2'], notes: 'Fui a um aniversário no jantar.', waterIntakeLiters: 1.8 }
        ],
        professionalId: 'p3'
    },
    { id: 'pt2', clinicId: 'c1', name: 'Mariana Souza', email: 'mari@email.com', password: '123', phone: '222', birthDate: '2001-08-15', gender: 'Feminino', status: 'ATIVO', professionalId: 'p3' },
    {
        id: 'pt_meire',
        clinicId: 'c1',
        name: 'Meire Mendes Dos Reis Da Costa',
        email: 'meire@email.com',
        password: '123',
        phone: '999',
        birthDate: '1970-01-01', // Data genérica, ajustar se necessário
        gender: 'Feminino',
        status: 'ATIVO',
        clinicalSummary: {
            clinicalGoal: 'Emagrecimento e controle glicêmico',
            activeDiagnoses: ['Sobrepeso']
        },
        anthropometry: {
            weight: 72.6,
            height: 1.62,
            bmi: 27.7,
            bodyFatPercentage: 33.2,
            fatMass: 24.1,
            leanMass: 48.5,
            circNeck: 33.5,
            circChest: 55, // Conforme imagem (embora pareça baixo)
            circWaist: 82.5,
            circHip: 104,
            circAbdomen: 87,
            circArmRelaxed: 30,
            circForearm: 23,
            circThigh: 57,
            circCalf: 38,
            waistToHipRatio: 0.79,
            // Dobras (última avaliação 14/02/2026)
            skinfoldTriceps: 26,
            skinfoldBiceps: 7,
            skinfoldSubscapular: 24,
            skinfoldSuprailiac: 20
        },
        anthropometryHistory: [
            {
                date: '2025-10-07', weight: 78.3, height: 1.62, bmi: 29.8, bodyFatPercentage: 34.7, fatMass: 27.2, leanMass: 51.1, waistCircumference: 81.4,
                circNeck: 33.3, circChest: 55, circWaist: 81.4, circHip: 118.8, circAbdomen: 96, circArmRelaxed: 33, circForearm: 24, circThigh: 55, circCalf: 37.5,
                skinfoldTriceps: 30, skinfoldBiceps: 12, skinfoldSubscapular: 22, skinfoldSuprailiac: 22, skinfoldProtocol: 'DurninWomersley'
            },
            {
                date: '2025-11-08', weight: 77.3, height: 1.62, bmi: 29.5, bodyFatPercentage: 34.9, fatMass: 27.0, leanMass: 50.3, waistCircumference: 81.5,
                circNeck: 33, circWaist: 81.5, circHip: 110, circAbdomen: 87, circArmRelaxed: 34, circForearm: 25, circThigh: 57, circCalf: 38,
                skinfoldTriceps: 28, skinfoldBiceps: 10, skinfoldAbdominal: 27, skinfoldSubscapular: 25, skinfoldSuprailiac: 24, skinfoldProtocol: 'DurninWomersley'
            },
            {
                date: '2025-12-04', weight: 74.65, height: 1.62, bmi: 28.4, bodyFatPercentage: 33.9, fatMass: 25.3, leanMass: 49.3, waistCircumference: 80.0,
                circNeck: 33, circWaist: 80, circHip: 105, circAbdomen: 83.5, circArmRelaxed: 32, circForearm: 25, circThigh: 55, circCalf: 38,
                skinfoldTriceps: 29, skinfoldBiceps: 10, skinfoldSubscapular: 20, skinfoldSuprailiac: 22, skinfoldProtocol: 'DurninWomersley'
            },
            {
                date: '2026-01-10', weight: 72.2, height: 1.62, bmi: 27.5, bodyFatPercentage: 32.1, fatMass: 23.2, leanMass: 49.0, waistCircumference: 79.0,
                circNeck: 33, circWaist: 79, circHip: 104, circAbdomen: 84, circArmRelaxed: 31, circForearm: 24, circThigh: 55, circCalf: 37,
                skinfoldTriceps: 23, skinfoldBiceps: 10, skinfoldAbdominal: 20, skinfoldSubscapular: 18, skinfoldSuprailiac: 20, skinfoldProtocol: 'DurninWomersley'
            },
            {
                date: '2026-02-14', weight: 72.6, height: 1.62, bmi: 27.7, bodyFatPercentage: 33.2, fatMass: 24.1, leanMass: 48.5, waistCircumference: 82.5,
                circNeck: 33.5, circWaist: 82.5, circHip: 104, circAbdomen: 87, circArmRelaxed: 30, circForearm: 23, circThigh: 57, circCalf: 38,
                skinfoldTriceps: 26, skinfoldBiceps: 7, skinfoldSubscapular: 24, skinfoldSuprailiac: 20, skinfoldProtocol: 'DurninWomersley'
            }
        ],
        financial: {
            mode: 'CONVENIO',
            transactions: [
                { id: 't-me-1', date: '2026-02-10T11:00:00Z', amount: 180, originalAmount: 180, method: 'GUIA_CONVENIO', status: 'PAGO', description: 'Consulta Autorizada Unimed' },
                { id: 't-me-2', date: '2026-02-28T16:00:00Z', amount: 180, originalAmount: 180, method: 'GUIA_CONVENIO', status: 'PAGO', description: 'Retorno Autorizado Unimed' },
                { id: 't-me-3', date: '2026-03-05T10:00:00Z', amount: 50, originalAmount: 50, method: 'DINHEIRO', status: 'PAGO', description: 'Co-participação Exame' }
            ]
        },
        adherenceHistory: [
            { id: 'ad-m1', date: '2026-02-28T10:00:00Z', day: '2026-02-28', status: 'TOTAL', mealsAdhered: ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'], waterIntakeLiters: 3.0 },
            { id: 'ad-m2', date: '2026-03-01T10:00:00Z', day: '2026-03-01', status: 'TOTAL', mealsAdhered: ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'], waterIntakeLiters: 2.8 }
        ],
        professionalId: 'p3'
    }
];

class DatabaseService {
    public ai: GoogleGenerativeAI | null = null;
    private clinics: Clinic[] = [];
    private users: User[] = [];
    private professionals: Professional[] = [];
    private patients: Patient[] = [];
    private appointments: Appointment[] = [];
    private exams: Exam[] = [];
    private alerts: ClinicalAlert[] = [];
    private patientEvents: PatientEvent[] = []; // NEW: Store events
    private examRequests: ExamRequest[] = []; // NOVO: Solicitações de exames
    private mipanAssessments: MipanAssessment[] = []; // NOVO: Perfil Psicocomportamental
    private prescriptions: Prescription[] = []; // NOVO: Prescrição Clínica
    private STORAGE_KEY = 'CONTROLCLIN_DB_V9_MULTI_PLAN';
    public isRemoteEnabled: boolean = false;
    private activeClinicId: string | null = null;
    private remoteSyncUnsubscribe: (() => void) | null = null;
    private isUpdatingFromRemote: boolean = false; // Guard to prevent infinite loops during sync

    private applyRemoteData(data: any) {
        this.clinics = data.clinics || [];
        this.users = data.users || [];
        this.professionals = data.professionals || [];
        this.patients = data.patients || [];
        this.appointments = data.appointments || [];
        this.exams = data.exams || [];
        this.alerts = data.alerts || [];
        this.patientEvents = data.patientEvents || [];
        this.examRequests = data.examRequests || [];
        this.mipanAssessments = data.mipanAssessments || [];
        this.prescriptions = data.prescriptions || [];

        // Update modified flag based on remote
        const remoteModified = data.lastModified ? new Date(data.lastModified).getTime() : Date.now();
        (this as any)._localLastModified = remoteModified;

        this.ensureDemoIntegrity();
    }

    constructor() {
        const meta = (import.meta as any);
        const apiKey = meta.env?.VITE_GEMINI_API_KEY;
        if (apiKey && apiKey.length > 0 && apiKey !== 'PLACEHOLDER') {
            try {
                this.ai = new GoogleGenerativeAI(apiKey);
                console.log("DatabaseService: AI initialized successfully.");
            } catch (error) {
                console.warn("GoogleGenAI init failed, AI features disabled.", error);
                this.ai = null;
            }
        } else {
            console.warn("GEMINI_API_KEY missing or placeholder. AI features will be disabled.");
            this.ai = null;
        }

        this.checkRemoteConfig();
        this.initializeData();
    }

    private async initializeData() {
        // First try to load from local storage to have something immediate
        this.loadFromStorage();

        // Then if remote is enabled, try to load from remote and update
        if (this.isRemoteEnabled) {
            console.log("DatabaseService: Attempting remote sync on init...");
            await this.loadFromRemote();
        }
    }

    private checkRemoteConfig() {
        if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'PLACEHOLDER') {
            this.isRemoteEnabled = true;
            console.log("[DB] ✅ Remote DB enabled (Firebase). ProjectID:", firebaseConfig.projectId);
        } else {
            console.warn("[DB] ❌ Remote DB DISABLED — Firebase API KEY não configurada. Usando apenas LocalStorage.");
        }
    }

    // --- PERSISTENCE HELPERS ---
    private loadFromStorage() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.clinics = data.clinics || [];
                this.users = data.users || [];
                this.professionals = data.professionals || [];
                this.patients = data.patients || [];
                this.appointments = data.appointments || [];
                this.exams = data.exams || [];
                this.alerts = data.alerts || [];
                this.patientEvents = data.patientEvents || [];
                this.examRequests = data.examRequests || [];
                this.mipanAssessments = data.mipanAssessments || [];
                this.prescriptions = data.prescriptions || [];

                // Keep track of when we last touched local storage
                if (data.lastModified) {
                    (this as any)._localLastModified = new Date(data.lastModified).getTime();
                } else {
                    (this as any)._localLastModified = Date.now();
                }

                this.ensureDemoIntegrity();
            } catch (err) {
                console.error("DatabaseService: Shared database corrupted. Resetting to defaults.", err);
                this.seedInitialData();
            }
        } else {
            this.seedInitialData();
        }
    }

    private ensureDemoIntegrity() {
        DEFAULT_PATIENTS.forEach(stdP => {
            const pIdx = this.patients.findIndex(p => p.id === stdP.id);
            if (pIdx === -1) {
                this.patients.push(stdP);
            } else {
                // Force sync auth fields for demo patients to avoid old storage locking them out
                if (!this.patients[pIdx].email || !this.patients[pIdx].password) {
                    this.patients[pIdx].email = stdP.email;
                    this.patients[pIdx].password = stdP.password;
                }
            }
        });
        this.saveToStorage(false);
    }

    private seedInitialData() {
        console.log("DatabaseService: Seeding initial mock data...");
        this.clinics = [...DEFAULT_CLINICS];
        this.users = [...DEFAULT_USERS];
        this.professionals = [...DEFAULT_PROFESSIONALS];
        this.patients = [...DEFAULT_PATIENTS];
        this.saveToStorage(false);
    }

    private async saveToRemote(clinicId?: string) {
        if (!this.isRemoteEnabled || this.isUpdatingFromRemote) return;

        const targetClinicId = clinicId || this.activeClinicId || this.clinics[0]?.id || 'global_v1';

        try {
            const docRef = doc(firestore, "clinics", targetClinicId, "data", "main");

            // --- PROTEÇÃO CRÍTICA DE DADOS (SMART MERGE) ---
            // Antes de jogar nossos dados na nuvem, pegamos a versão fresca do servidor 
            // e fazemos a fusão (merge) inteligente para NÃO perder hisróricos (ex: Antropometria).
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const remote = snap.data();

                // 1. Fusão Inteligente de Pacientes e Históricos (SMART BIDIRECTIONAL MERGE)
                // Garantimos que pacientes na nuvem que não estão no local sejam preservados e que históricos sejam fundidos sem perdas.
                const remotePatients = remote.patients || [];
                const localPatientsMap = new Map();
                this.patients.forEach(p => localPatientsMap.set(p.id, p));

                remotePatients.forEach((remoteP: any) => {
                    if (!localPatientsMap.has(remoteP.id)) {
                        // Paciente novo na nuvem (ou que não carregou localmente) -> PRESERVAR
                        this.patients.push(remoteP);
                    } else {
                        // Paciente já existe no local -> FUNDIR DADOS CRÍTICOS
                        const localP = localPatientsMap.get(remoteP.id);

                        // Merge de Antropometria: Preservar histórico de ambos os lados
                        const remoteHistory = remoteP.anthropometryHistory || [];
                        const localHistory = localP.anthropometryHistory || [];

                        if (remoteHistory.length > 0 || localHistory.length > 0) {
                            const combined = [...remoteHistory, ...localHistory];

                            // Deduplicação robusta: Data ISO (até segundos) + Peso
                            const uniqueMap = new Map();
                            combined.forEach((item: any) => {
                                if (!item.date) return;
                                // Usamos a data até os segundos para permitir múltiplas avaliações no mesmo dia
                                // mas evitar duplicatas de cliques duplos/lag de rede
                                const datePart = item.date.includes('T') ? item.date.split('.')[0] : item.date;
                                const key = `${datePart}_${item.weight}`;
                                uniqueMap.set(key, item);
                            });

                            localP.anthropometryHistory = Array.from(uniqueMap.values()).sort(
                                (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
                            );

                            // Atualizar o resumo rápido (anthropometry) com o registro mais recente
                            if (localP.anthropometryHistory.length > 0) {
                                // Se o local for nulo ou o remoto for mais recente, atualizamos o objeto de resumo
                                localP.anthropometry = { ...localP.anthropometryHistory[localP.anthropometryHistory.length - 1] };
                            }
                        }

                        // Merge Perfil MIPAN e Alertas Clínicos
                        if (remoteP.clinicalSummary?.psychobehavioral && !localP.clinicalSummary?.psychobehavioral) {
                            if (!localP.clinicalSummary) localP.clinicalSummary = { clinicalGoal: '', activeDiagnoses: [] };
                            localP.clinicalSummary.psychobehavioral = remoteP.clinicalSummary.psychobehavioral;
                        }

                        // Merge de Planos Nutricionais (se houver novos na nuvem)
                        if (remoteP.nutritionalPlans && (!localP.nutritionalPlans || localP.nutritionalPlans.length < remoteP.nutritionalPlans.length)) {
                            localP.nutritionalPlans = remoteP.nutritionalPlans;
                        }
                    }
                });

                // 2. Fusão de Arrays Genéricos (Agendamentos, Eventos, Exames)
                const mergeArray = (localArr: any[], remoteArr: any[]) => {
                    if (!remoteArr) return localArr;
                    const localIds = new Set(localArr.map(x => x.id));
                    remoteArr.forEach(r => {
                        if (!localIds.has(r.id)) localArr.push(r);
                    });
                    return localArr;
                };

                this.appointments = mergeArray(this.appointments, remote.appointments);
                this.patientEvents = mergeArray(this.patientEvents, remote.patientEvents);
                this.exams = mergeArray(this.exams, remote.exams);
                this.examRequests = mergeArray(this.examRequests, remote.examRequests);
                this.prescriptions = mergeArray(this.prescriptions, remote.prescriptions);
                this.mipanAssessments = mergeArray(this.mipanAssessments, remote.mipanAssessments);
                this.professionals = mergeArray(this.professionals, remote.professionals);
                this.users = mergeArray(this.users, remote.users);
            }
            // --- FIM DA PROTEÇÃO ---

            const data = {
                clinics: this.clinics,
                users: this.users,
                professionals: this.professionals,
                patients: this.patients,
                appointments: this.appointments,
                exams: this.exams,
                alerts: this.alerts,
                patientEvents: this.patientEvents,
                examRequests: this.examRequests,
                mipanAssessments: this.mipanAssessments,
                prescriptions: this.prescriptions,
                updatedAt: new Date().toISOString(),
                lastModified: Date.now()
            };

            const sanitizedData = JSON.parse(JSON.stringify(data));
            await setDoc(docRef, sanitizedData);

            // Atualizamos a modificação interna para não causar loop no listener do Firestore
            (this as any)._localLastModified = data.lastModified;

            console.log(`[DB] 🛡️ Smart Sync (Safe Merge) executado com sucesso: ${targetClinicId}`);
        } catch (err: any) {
            console.error("DatabaseService: Falha crítica de sync. Dados mantidos apenas locais por segurança.", err?.message || err);
            throw new Error(`Erro na Nucléia de Dados: ${err.message || err}`);
        }
    }

    public async loadFromRemote(clinicId?: string) {
        if (!this.isRemoteEnabled) {
            console.warn('[DB] loadFromRemote() ignorado — Firebase não configurado.');
            return;
        }

        // PRIORITIZE 'c1' (REAL CLINIC) OVER 'global_v1' (LEGACY/DEMO)
        const targetClinicId = clinicId || this.activeClinicId || (this.clinics.length > 0 ? this.clinics[0].id : null) || 'c1';
        this.activeClinicId = targetClinicId;

        // --- NEW: REAL-TIME SYNC LISTENER (ONSNAPSHOT) ---
        // Clean up previous listener if switching clinics
        if (this.remoteSyncUnsubscribe) {
            this.remoteSyncUnsubscribe();
            this.remoteSyncUnsubscribe = null;
        }

        console.log(`[DB] 📡 Ativando sincronização em tempo real para: ${targetClinicId}`);
        const docRef = doc(firestore, "clinics", targetClinicId, "data", "main");

        // --- 2. INITIAL CHECK ---
        try {
            console.log(`[DB] 🔍 Sincronização direta: ${targetClinicId}`);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                const remoteModified = data.lastModified ? new Date(data.lastModified).getTime() : 0;
                const localModified = (this as any)._localLastModified || 0;

                const isMockData = this.patients.every(p => p.professionalId === 'system-demo' || ['pt1', 'pt2', 'pt_meire'].includes(p.id));
                const hasRealDataLocally = this.patients.some(p => p.id.startsWith('pt-') && p.professionalId !== 'system-demo');
                const isJustSeeded = (this.patients.length <= 4 && this.appointments.length === 0) || !hasRealDataLocally || isMockData;

                if (remoteModified > localModified || isJustSeeded) {
                    console.log(`[DB] 🔽 Baixando atualização remota (Versão mais nova ou Recuperação de Dados)...`);
                    this.applyRemoteData(data);
                    this.saveToStorage(false, remoteModified);
                } else {
                    console.log(`[DB] ✅ Local já sincronizado ou mais recente.`);
                }
            } else {
                console.warn(`[DB] ⚠️ Clínica ${targetClinicId} sem dados na nuvem.`);
            }
        } catch (err) {
            console.error('[DB] Initial sync error:', err);
        }

        // Subscribe to real-time updates
        this.remoteSyncUnsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const remoteModified = data.lastModified ? new Date(data.lastModified).getTime() : 0;
                const localModified = (this as any)._localLastModified || 0;

                // Sync protection: Only update if Remote is definitely newer, 
                // OR if it's our first real cloud hit and we only have mock data locally.
                const isMockData = this.patients.every(p => p.professionalId === 'system-demo' || ['pt1', 'pt2', 'pt_meire'].includes(p.id));
                const hasRealDataLocally = this.patients.some(p => p.id.startsWith('pt-') && p.professionalId !== 'system-demo');
                const isJustSeeded = (this.patients.length <= 4 && this.appointments.length === 0) || !hasRealDataLocally || isMockData;

                if (remoteModified > localModified || (localModified === 0 && isJustSeeded)) {
                    this.isUpdatingFromRemote = true; // Block loop
                    console.log(`[DB] ☁️ Atualização remota recebida.`);

                    this.applyRemoteData(data);
                    this.saveToStorage(false, remoteModified);

                    this.isUpdatingFromRemote = false; // Unlock
                    window.dispatchEvent(new CustomEvent('db-remote-sync'));
                }
            }
        }, (err) => {
            console.error('[DB] ❌ Erro no listener remoto:', err);
        });
    }

    /**
     * Centralized Save (LocalStorage + Cloud)
     * Now returns a promise for operations that need to guarantee remote persistence.
     */
    public async saveToStorage(syncRemote = true, manualTimestamp?: number) {
        if (this.isUpdatingFromRemote && syncRemote) return; // Guard

        (this as any)._localLastModified = manualTimestamp || Date.now();

        const dataToStore = {
            clinics: this.clinics,
            users: this.users,
            professionals: this.professionals,
            patients: this.patients,
            appointments: this.appointments,
            patientEvents: this.patientEvents,
            exams: this.exams,
            alerts: this.alerts,
            examRequests: this.examRequests,
            mipanAssessments: this.mipanAssessments,
            prescriptions: this.prescriptions,
            lastModified: (this as any)._localLastModified
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));

        if (syncRemote && this.isRemoteEnabled) {
            try {
                // If this is a high-priority operation, we might want to await it. 
                // For background sync, we fire and forget but catch for errors.
                await this.saveToRemote();
            } catch (err) {
                console.error('[DB] ❌ Sincronização automática com Firebase falhou:', err);
            }
        }
    }

    // Método público para forçar sincronização manual com o Firebase
    public async forceSync(): Promise<{ success: boolean; message: string }> {
        if (!this.isRemoteEnabled) {
            return { success: false, message: 'Firebase não configurado (variáveis de ambiente ausentes).' };
        }
        try {
            await this.saveToRemote();
            return { success: true, message: 'Sincronização com Firebase realizada com sucesso! ✅' };
        } catch (err: any) {
            return { success: false, message: `Falha na sincronização na nuvem: ${err.message || err}` };
        }
    }

    private async delay(ms = 300) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- PATIENT EVENTS (NEW) ---

    // Internal helper to append events
    private logPatientEvent(
        patientId: string,
        type: PatientEvent['type'],
        payload: any,
        summary: string,
        user?: User
    ) {
        const event: PatientEvent = {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientId,
            type,
            payload,
            summary,
            createdAt: new Date().toISOString(),
            createdBy: user ? { userId: user.id, name: user.name, role: user.role } : undefined
        };

        // 1. Centralized Log (for global reports)
        this.patientEvents.unshift(event);

        // 2. Synchronize with Patient Object (for instant UI update in PatientDetails)
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx > -1) {
            const patient = this.patients[pIdx];

            // Map PatientEvent to TimelineEvent if applicable
            const timelineEvent: TimelineEvent = {
                id: event.id,
                date: event.createdAt,
                type: this.mapPatientToTimelineType(type),
                title: summary,
                description: payload.description || '',
                professionalId: user?.professionalId,
                authorName: user?.name
            };

            const timelineEvents = patient.timelineEvents ? [...patient.timelineEvents] : [];
            timelineEvents.unshift(timelineEvent);

            this.patients[pIdx] = {
                ...patient,
                timelineEvents: timelineEvents
            };
        }

        this.saveToStorage();
    }

    private mapPatientToTimelineType(type: PatientEvent['type']): TimelineEventType {
        switch (type) {
            case 'ANTHRO_RECORDED': return 'AVALIACAO_FISICA';
            case 'EXAM_UPLOADED': return 'SOLICITACAO_EXAMES';
            case 'PLAN_CREATED':
            case 'PLAN_UPDATED': return 'ATUALIZACAO_PLANO';
            case 'PAYMENT_RECORDED': return 'OUTRO'; // Use generic or custom if needed
            case 'NOTE_ADDED': return 'CONSULTA_ROTINA';
            default: return 'OUTRO';
        }
    }

    // Retrieve events for a patient (chronological descending)
    async listPatientEvents(patientId: string): Promise<PatientEvent[]> {
        const events = this.patientEvents
            .filter(e => e.patientId === patientId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Backfill check: If no events, generate them from existing data
        if (events.length === 0) {
            return await this.backfillPatientEvents(patientId);
        }
        return events;
    }

    // Generate historical events from current state if log is empty
    private async backfillPatientEvents(patientId: string): Promise<PatientEvent[]> {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) return [];

        const events: PatientEvent[] = [];
        const baseTime = new Date().getTime();

        // 1. Initial Creation
        events.push({
            id: `bkf-init-${patientId}`,
            patientId,
            type: 'BACKFILL_INIT',
            createdAt: new Date(baseTime - 10000000).toISOString(),
            payload: { name: patient.name },
            summary: 'Paciente cadastrado (Backfill)'
        });

        // 2. Appointments
        const apps = this.appointments.filter(a => a.patientId === patientId);
        apps.forEach(a => {
            events.push({
                id: `bkf-appt-${a.id}`,
                patientId,
                type: 'APPOINTMENT_STATUS',
                createdAt: a.startTime,
                payload: { id: a.id, status: a.status, type: a.type },
                summary: `Consulta ${a.status.toLowerCase()}: ${a.type}`
            });
        });

        // 3. Exams
        const exams = this.exams.filter(e => e.patientId === patientId);
        exams.forEach(e => {
            events.push({
                id: `bkf-exam-${e.id}`,
                patientId,
                type: 'EXAM_UPLOADED',
                createdAt: e.createdAt || new Date(baseTime - 500000).toISOString(),
                payload: { id: e.id, name: e.name },
                summary: `Exame anexado: ${e.name}`
            });
        });

        // 4. Anthro History
        if (patient.anthropometryHistory) {
            patient.anthropometryHistory.forEach((rec, idx) => {
                events.push({
                    id: `bkf-anthro-${idx}`,
                    patientId,
                    type: 'ANTHRO_RECORDED',
                    createdAt: rec.date,
                    payload: rec,
                    summary: `Antropometria registrada (Peso: ${rec.weight}kg)`
                });
            });
        }

        // 5. Notes
        if (patient.clinicalNotes) {
            patient.clinicalNotes.forEach((n, idx) => {
                events.push({
                    id: `bkf-note-${n.id}`,
                    patientId,
                    type: 'NOTE_ADDED',
                    createdAt: n.date,
                    payload: { content: n.content },
                    summary: `Evolução clínica registrada`
                });
            });
        }

        // Sort and save generated events so we don't backfill again
        events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.patientEvents.push(...events);
        this.saveToStorage();

        return events;
    }

    // --- REPORT AGGREGATOR ---
    async buildIndividualReportDataset(patientId: string, professionalIdFilter?: string): Promise<IndividualReportSnapshot | null> {
        await this.delay(100);
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) return null;

        // Security Lock: Professionals can only see their own patients OR patients with whom they have an appointment
        const pidStr = professionalIdFilter ? String(professionalIdFilter).trim() : null;
        if (pidStr && pidStr !== 'all' && pidStr !== 'undefined') {
            const isAssigned = String(patient.professionalId).trim() === pidStr;
            const hasAppointment = this.appointments.some(a => String(a.patientId).trim() === String(patientId).trim() && String(a.professionalId).trim() === pidStr);

            if (!isAssigned && !hasAppointment) {
                console.warn(`[DB] Security Block for ${patient.name}: ProfFilter=${pidStr}, PatientProf=${patient.professionalId}`);
                return null;
            }
        }

        // 1. Fetch Timeline (with Backfill)
        const timeline = await this.listPatientEvents(patientId);

        // 2. Appointments & KPIs
        let appointments = this.appointments.filter(a => a.patientId === patientId);
        if (professionalIdFilter) {
            appointments = appointments.filter(a => a.professionalId === professionalIdFilter);
        }

        // Sort appointments DESC
        appointments.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        const totalAppts = appointments.length;
        const completed = appointments.filter(a => a.status === 'REALIZADO' || a.status === 'CONFIRMADO').length;
        const attendanceRate = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;

        const nextAppt = appointments.find(a => new Date(a.startTime) > new Date() && a.status !== 'CANCELADO');
        // Reverse find for first appointment/event for "Patient Since"
        const patientSince = timeline.length > 0
            ? new Date(timeline[timeline.length - 1].createdAt).toLocaleDateString()
            : new Date().toLocaleDateString();

        // 3. Anthropometry
        // Ensure current snapshot + history are aligned and sorted chronologically
        const anthroSnapshot = await this.getAnthroSnapshot(patientId);
        let anthroHistory = [...(patient.anthropometryHistory || [])];

        // Ensure chronological order for evolution analysis
        anthroHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Snapshot of current vs history alignment
        if (anthroSnapshot.snapshot) {
            // If current is not in history, append it? 
            // Better to assume history is the source of truth for reports.
        }

        // 4. Clinical Context
        const activeDiagnoses = patient.clinicalSummary?.activeDiagnoses || [];
        const medications = patient.clinicalHistory?.medications || [];
        const anamnesisSummary = [
            Array.isArray(patient.clinicalHistory?.pathologies) ? patient.clinicalHistory?.pathologies.join(', ') : '',
            patient.clinicalHistory?.habits || '',
            patient.clinicalHistory?.symptoms || ''
        ].filter(Boolean).join('. ');

        // 5. Nutritional
        const activePlan = patient.nutritionalPlans?.find(p => p.status === 'ATIVO') || patient.nutritionalPlans?.[0];

        // 6. Financial
        const transactions = patient.financial?.transactions || [];
        const totalPaid = transactions.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0);
        const totalPending = transactions.filter(t => t.status === 'PENDENTE' || t.status === 'AGUARDANDO_AUTORIZACAO').reduce((acc, t) => acc + t.amount, 0);
        // 7. Exams
        const exams = this.exams.filter(e => e.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 8. MIPAN / Nutritional Plan Backup
        const nutritionalPlan = patient.nutritionalPlan || (patient.nutritionalPlans && patient.nutritionalPlans.length > 0 ? patient.nutritionalPlans[0] : null);

        // 5. Adherence Data
        const adherenceHistory = patient.adherenceHistory || [];
        const recentCheckins = adherenceHistory.slice(0, 7);
        let adherenceScore = 0;
        if (recentCheckins.length > 0) {
            const totalStatus = recentCheckins.reduce((acc, c) => {
                if (c.status === 'TOTAL') return acc + 100;
                if (c.status === 'PARCIAL') return acc + 50;
                return acc;
            }, 0);
            adherenceScore = Math.round(totalStatus / recentCheckins.length);
        }

        // 6. Timeline Construction
        timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            patient,
            metrics: {
                patientSince,
                totalAppointments: totalAppts,
                attendanceRate,
                nextAppointmentDate: nextAppt ? nextAppt.startTime : null
            },
            anthropometry: {
                current: anthroSnapshot.snapshot,
                history: anthroHistory,
                hasSufficientData: anthroHistory.length > 0
            },
            clinical: {
                activeDiagnoses: activeDiagnoses,
                medications: medications,
                anamnesisSummary: anamnesisSummary,
                notes: patient.clinicalNotes || []
            },
            exams: this.exams.filter(e => e.patientId === patientId),
            nutritional: {
                activePlanTitle: activePlan ? activePlan.title || 'Plano Atual' : null,
                targets: activePlan ? {
                    kcal: activePlan.caloricTarget || 0,
                    protein: activePlan.macroTargets.protein?.g || 0,
                    carbs: activePlan.macroTargets.carbs?.g || 0,
                    fat: activePlan.macroTargets.fat?.g || 0
                } : null
            },
            adherence: {
                score: adherenceScore,
                history: adherenceHistory
            },
            financial: {
                totalPaid: patient.financial?.transactions.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0) || 0,
                totalPending: patient.financial?.transactions.filter(t => t.status === 'PENDENTE' || t.status === 'AGUARDANDO_AUTORIZACAO').reduce((acc, t) => acc + t.amount, 0) || 0,
                mode: patient.financial?.mode || 'PARTICULAR'
            },
            mipanAssessments: await this.getMipanAssessments(patientId),
            timeline: timeline,
            metadata: {
                generatedAt: new Date().toISOString(),
                dataVersion: 'v2-comprehensive',
                source: 'ControlClin DB Service'
            }
        };
    }

    async recordAdherenceCheckIn(patientId: string, checkin: AdherenceCheckIn, user?: User) {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) throw new Error("Paciente não encontrado");

        const patient = this.patients[pIdx];
        const history = patient.adherenceHistory ? [...patient.adherenceHistory] : [];

        // Prevent duplicate check-ins for the same day
        const dayIdx = history.findIndex(h => h.day === checkin.day);
        if (dayIdx > -1) {
            history[dayIdx] = checkin;
        } else {
            history.unshift(checkin);
        }

        this.patients[pIdx] = { ...patient, adherenceHistory: history };

        const summaryText = checkin.status === 'TOTAL' ? "Aderência Total" : (checkin.status === 'PARCIAL' ? "Aderência Parcial" : "Não seguiu a dieta");
        this.logPatientEvent(patientId, 'ADHERENCE_CHECKIN', checkin, `Check-in de adesão: ${summaryText} para ${checkin.day}`, user || { id: patient.id, name: patient.name, role: 'PATIENT' } as any);

        this.saveToStorage();
        return this.patients[pIdx];
    }

    // --- STANDARD CRUD METHODS (Abbreviated for focus on Nutritional Plan) ---
    async login(email: string, pass: string, slug: string): Promise<{ user: User, clinic: Clinic } | null> {
        try {
            // 1. Find clinic by slug
            const clinic = this.clinics.find(c => c.slug.toLowerCase() === slug.toLowerCase());
            if (!clinic) throw new Error("Clínica não encontrada.");

            // --- VALIDAÇÃO SAAS (ACESSA APENAS SE TRIAL OU ACTIVE) ---
            const saasStatus = await saasService.getClinicStatus(clinic.id);
            if (saasStatus === 'canceled' || saasStatus === 'past_due') {
                // Permite apenas se o usuário for o Root Admin global ou se for a Clínica Principal Demo
                if (clinic.id !== 'c1' && email.toLowerCase() !== 'root@control.com') {
                    throw new Error(`Acesso bloqueado: Assinatura ${saasStatus === 'canceled' ? 'Cancelada' : 'Aguardando Pagamento'}. Entre em contato com o suporte.`);
                }
            }

            // 2. Real Auth with Firebase (with DEV bypass)
            let userEmailToMatch = email.trim().toLowerCase();
            if (pass !== "123") {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                const fbUser = userCredential.user;
                if (fbUser.email) userEmailToMatch = fbUser.email.toLowerCase();
            } else {
                console.warn("[DEV MODE] Bypassing Firebase auth because password is '123'");
            }

            // 3. Find our internal user record by email AND clinicId
            let user = this.users.find(u => u.email.toLowerCase() === userEmailToMatch && u.clinicId === clinic.id);

            if (!user) {
                if (pass === "123" && email.includes("@")) {
                    const emailLower = email.toLowerCase();
                    const namePart = emailLower.split('@')[0];
                    const isAdm = emailLower.includes('admin') || emailLower.includes('roberto');

                    const fallbackUser: User = {
                        id: `u-${namePart}-${Date.now()}`,
                        clinicId: clinic.id,
                        name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
                        email: email,
                        role: isAdm ? Role.CLINIC_ADMIN : Role.PROFESSIONAL,
                        professionalId: isAdm ? 'p1' : `p-${namePart}`,
                        password: '123'
                    };

                    if (fallbackUser.role === Role.PROFESSIONAL) {
                        const existingProf = this.professionals.find(p => p.email.toLowerCase() === emailLower);
                        if (!existingProf) {
                            this.professionals.push({
                                id: fallbackUser.professionalId!,
                                clinicId: clinic.id,
                                userId: fallbackUser.id,
                                name: fallbackUser.name,
                                email: fallbackUser.email,
                                phone: '',
                                specialty: 'Nutrição/Geral',
                                registrationNumber: 'REG-TEMP',
                                color: 'bg-emerald-200',
                                isActive: true
                            });
                        }
                    }
                    this.users.push(fallbackUser);
                    user = fallbackUser;
                } else {
                    throw new Error("Usuário não cadastrado nesta clínica específica ou slug incorreto.");
                }
            }

            console.log(`[DB] Login validado para: ${user.name} na clínica ${clinic.name}`);
            await this.loadFromRemote(clinic.id);
            user = this.users.find(u => u.email.toLowerCase() === userEmailToMatch && u.clinicId === clinic.id) || user;
            return { user, clinic };
        } catch (error: any) {
            console.error("[DB] Erro no login:", error);
            throw error;
        }
    }

    async loginPatient(email: string, pass: string, slug: string): Promise<{ patient: Patient, clinic: Clinic } | null> {
        try {
            const clinic = this.clinics.find(c => c.slug.toLowerCase() === slug.toLowerCase());
            if (!clinic) throw new Error("Clínica não encontrada.");

            // --- VALIDAÇÃO SAAS (ACESSA APENAS SE TRIAL OU ACTIVE) ---
            const saasStatus = await saasService.getClinicStatus(clinic.id);
            if (saasStatus === 'canceled' || saasStatus === 'past_due') {
                // Permite apenas se o usuário for o Root Admin global ou se for a Clínica Principal Demo
                if (clinic.id !== 'c1' && email.toLowerCase() !== 'root@control.com') {
                    throw new Error(`Acesso bloqueado: Assinatura ${saasStatus === 'canceled' ? 'Cancelada' : 'Aguardando Pagamento'}. Entre em contato com o suporte.`);
                }
            }

            const patient = this.patients.find(p =>
                p.clinicId === clinic.id &&
                p.email.toLowerCase() === email.toLowerCase() &&
                p.password === pass
            );

            if (patient) {
                console.log(`[DB] Patient login successful: ${patient.name}`);
                await this.loadFromRemote(clinic.id);
                const freshPatient = this.patients.find(p => p.id === patient.id) || patient;
                return { patient: freshPatient, clinic };
            }

            console.warn(`[DB] Patient login failed: No match for ${email} in clinic ${slug}`);
            return null;
        } catch (error: any) {
            console.error("[DB] Erro no login do paciente:", error);
            throw error;
        }
    }

    async logout() {
        await signOut(auth);
    }
    async getUsers(clinicId: string) { return this.users.filter(u => u.clinicId === clinicId); }
    async getClinic(clinicId: string) { return this.clinics.find(c => c.id === clinicId); }
    async updateClinicSettings(user: User, clinicId: string, data: Partial<Clinic>) {
        const idx = this.clinics.findIndex(c => c.id === clinicId);
        if (idx > -1) { this.clinics[idx] = { ...this.clinics[idx], ...data }; this.saveToStorage(); return this.clinics[idx]; }
        throw new Error("Clinic not found");
    }
    async resetClinicData(user: User, clinicId: string) {
        if (user.role !== Role.SUPER_ADMIN) throw new Error("Denied");
        this.patients = []; this.appointments = []; this.exams = [];
        this.saveToStorage();
    }
    async getProfessionals(clinicId: string) { return this.professionals.filter(p => p.clinicId === clinicId && p.isActive); }
    async createProfessional(user: User, data: any) {
        // Enforce Unique Email
        const lowerEmail = data.email.trim().toLowerCase();
        const existing = this.users.find(u => u.email.toLowerCase() === lowerEmail);
        if (existing) {
            throw new Error(`O e-mail ${data.email} já está sendo utilizado por outro usuário nesta ou em outra clínica.`);
        }

        const ts = Date.now();
        const rnd = Math.random().toString(36).substr(2, 6);
        const userId = `u-${ts}-${rnd}`;
        const profId = `p-${ts}-${rnd}`;

        const newUser: User = {
            id: userId,
            clinicId: user.clinicId,
            name: data.name,
            email: data.email,
            role: data.role || Role.PROFESSIONAL,
            professionalId: profId,
            password: data.password || '123'
        };

        const newProf: Professional = {
            id: profId,
            clinicId: user.clinicId,
            userId: userId,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            specialty: data.specialty,
            registrationNumber: data.registrationNumber,
            color: data.color || 'bg-blue-200',
            isActive: true,
            cpf: data.cpf,
            whatsapp: data.whatsapp,
            address: data.address,
            cep: data.cep,
            city: data.city,
            state: data.state
        };

        this.users.push(newUser);
        this.professionals.push(newProf);

        // CRITICAL: Await the save to guarantee persistence
        await this.saveToStorage(true);
        console.log(`[DB] ✅ Profissional criado e sincronizado: ${newProf.name} (ID: ${profId})`);
        return newProf;
    }

    async updateProfessional(user: User, id: string, data: any) {
        const pIdx = this.professionals.findIndex(p => p.id === id);
        if (pIdx > -1) {
            // CRITICAL FIX: Only update Professional-safe fields.
            // Do NOT spread raw form data (which includes password, role, etc.)
            const existing = this.professionals[pIdx];
            this.professionals[pIdx] = {
                ...existing,
                name: data.name ?? existing.name,
                email: data.email ?? existing.email,
                phone: data.phone ?? existing.phone,
                specialty: data.specialty ?? existing.specialty,
                registrationNumber: data.registrationNumber ?? existing.registrationNumber,
                color: data.color ?? existing.color,
                isActive: typeof data.isActive === 'boolean' ? data.isActive : existing.isActive,
                cpf: data.cpf ?? existing.cpf,
                whatsapp: data.whatsapp ?? existing.whatsapp,
                address: data.address ?? existing.address,
                cep: data.cep ?? existing.cep,
                city: data.city ?? existing.city,
                state: data.state ?? existing.state,
            };

            // Sync User data (separate entity — only user-specific fields)
            const uIdx = this.users.findIndex(u => u.id === existing.userId);
            if (uIdx > -1) {
                this.users[uIdx].name = data.name ?? this.users[uIdx].name;
                this.users[uIdx].email = data.email ?? this.users[uIdx].email;
                if (data.role) this.users[uIdx].role = data.role;
                if (data.password && data.password.trim() !== '') {
                    this.users[uIdx].password = data.password;
                }
            }

            this.saveToStorage();
            console.log(`[DB] ✅ Profissional atualizado: ${this.professionals[pIdx].name}`);
            return this.professionals[pIdx];
        }
        throw new Error("Profissional não encontrado");
    }

    async deleteProfessional(user: User, id: string) {
        const pIdx = this.professionals.findIndex(p => p.id === id);
        if (pIdx > -1) {
            const prof = this.professionals[pIdx];

            // Logic to check impacted future appointments BEFORE deletion
            const futureAppts = this.appointments.filter(a => a.professionalId === id && new Date(a.startTime) > new Date());
            const count = futureAppts.length;

            // Cancel impacted future appointments
            futureAppts.forEach(appt => {
                const aIdx = this.appointments.findIndex(a => a.id === appt.id);
                if (aIdx > -1) {
                    this.appointments[aIdx].status = AppointmentStatus.CANCELED;
                }
            });

            // HARD DELETE: Remove professional from array
            this.professionals.splice(pIdx, 1);

            // Also remove the associated user to revoke login access
            const uIdx = this.users.findIndex(u => u.id === prof.userId);
            if (uIdx > -1) {
                this.users.splice(uIdx, 1);
            }

            this.saveToStorage();
            console.log(`[DB] 🗑️ Profissional excluído: ${prof.name} (ID: ${id}). ${count} agendamentos cancelados.`);
            return { reassigned: 0, cancelled: count };
        }
        throw new Error("Profissional não encontrado");
    }
    /**
     * getPatients: Central hub for patient retrieval.
     * GUARANTEES ROLE PRIVACY.
     */
    async getPatients(clinicId: string, professionalId?: string, forceMode: 'ADMIN' | 'PROFESSIONAL' = 'PROFESSIONAL') {
        const filtered = this.patients.filter(p => {
            // Must belong to the clinic
            if (p.clinicId !== clinicId) return false;

            // If a professionalId is provided, we STRICTLY filter.
            if (professionalId && professionalId !== 'all') {
                const isAssigned = p.professionalId === professionalId;
                const hasAppointment = this.appointments.some(a => a.patientId === p.id && a.professionalId === professionalId);
                return isAssigned || hasAppointment;
            }

            // CRITICAL SECURITY LOCK: 
            // If we are in Professional mode, we MUST have a professionalId to filter.
            // If it's missing, return NOTHING instead of everything.
            if (forceMode === 'PROFESSIONAL') {
                return false;
            }

            // In ADMIN mode with no filter (professionalId is null or 'all'), show all clinic patients
            return true;
        });

        return filtered;
    }
    async getPatientById(id: string) {
        return this.patients.find(p => p.id === id) || null;
    }
    async createPatient(user: User, data: any) {
        const p: Patient = {
            id: `pt-${Date.now()}`,
            clinicId: user.clinicId,
            ...data,
            nutritionalPlans: [],
            professionalId: user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN ? (data.professionalId || user.professionalId) : user.professionalId
        };
        this.patients.push(p);
        this.logPatientEvent(p.id, 'CUSTOM', { action: 'CREATED' }, 'Paciente criado', user);

        // GUARANTEE PERSISTENCE
        await this.saveToStorage(true);
        return p;
    }
    async updatePatient(user: User, id: string, data: any) {
        const idx = this.patients.findIndex(p => p.id === id);
        if (idx > -1) {
            // Immutable update: create a new object and update the array reference
            const updatedPatient = {
                ...this.patients[idx],
                ...data, // Shallow merge of all top-level keys
                // Deep merge specific objects to prevent wiping fields during Partial update
                clinicalSummary: {
                    ...(this.patients[idx].clinicalSummary || {}),
                    ...(data.clinicalSummary || {})
                },
                anthropometry: {
                    ...(this.patients[idx].anthropometry || {}),
                    ...(data.anthropometry || {})
                },
                clinicalHistory: {
                    ...(this.patients[idx].clinicalHistory || {}),
                    ...(data.clinicalHistory || {})
                }
            };

            this.patients[idx] = updatedPatient;

            // Detect changes for logging
            if (data.anthropometry) this.logPatientEvent(id, 'ANTHRO_RECORDED', {}, 'Medidas antropométricas atualizadas', user);
            if (data.clinicalSummary) this.logPatientEvent(id, 'DIAGNOSIS_UPDATED', {}, 'Resumo clínico atualizado', user);
            if (data.clinicalHistory) this.logPatientEvent(id, 'CUSTOM', { type: 'ANAMNESE' }, 'Ficha de anamnese atualizada', user);

            this.saveToStorage();
            return updatedPatient;
        }
        throw new Error("Paciente não encontrado");
    }
    async deletePatient(user: User, id: string) { this.patients = this.patients.filter(p => p.id !== id); this.saveToStorage(); }
    async getAppointments(clinicId: string, start: Date, end: Date, professionalId?: string, forceMode: 'ADMIN' | 'PROFESSIONAL' = 'PROFESSIONAL') {
        const filtered = this.appointments.filter(a => {
            if (a.clinicId !== clinicId) return false;

            // Strict Professional Filtering
            if (professionalId && professionalId !== 'all') {
                return a.professionalId === professionalId;
            }

            // Security Lock for Professionals
            if (forceMode === 'PROFESSIONAL') return false;

            const time = new Date(a.startTime).getTime();
            return time >= start.getTime() && time <= end.getTime();
        });
        return filtered;
    }
    async getUpcomingAppointments(clinicId: string, limit: number, professionalId?: string, forceMode: 'ADMIN' | 'PROFESSIONAL' = 'PROFESSIONAL') {
        const now = new Date().getTime();
        const filtered = this.appointments
            .filter(a => {
                if (a.clinicId !== clinicId) return false;

                // Strict Professional Filtering
                if (professionalId && professionalId !== 'all') {
                    return a.professionalId === professionalId;
                }

                // Security Lock for Professionals
                if (forceMode === 'PROFESSIONAL') return false;

                return new Date(a.startTime).getTime() >= now && a.status !== 'CANCELADO';
            });

        return filtered
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, limit);
    }
    async getPatientAppointmentsFullHistory(patientId: string, professionalId?: string) {
        return this.appointments.filter(a => {
            if (a.patientId !== patientId) return false;
            if (professionalId && a.professionalId !== professionalId) return false;
            return true;
        });
    }
    async createAppointment(user: User, data: any) {
        const a = { id: `apt-${Date.now()}`, ...data }; this.appointments.push(a);
        this.logPatientEvent(data.patientId, 'APPOINTMENT_STATUS', { status: data.status }, `Agendamento criado: ${data.type}`, user);
        this.saveToStorage(); return a;
    }
    async updateAppointment(user: User, id: string, data: any) {
        const idx = this.appointments.findIndex(a => a.id === id); if (idx > -1) {
            this.appointments[idx] = { ...this.appointments[idx], ...data };
            if (data.status) this.logPatientEvent(this.appointments[idx].patientId, 'APPOINTMENT_STATUS', { status: data.status }, `Status alterado para ${data.status}`, user);
            this.saveToStorage(); return this.appointments[idx];
        } throw new Error("Appt not found");
    }
    async deleteAppointment(user: User, id: string) { this.appointments = this.appointments.filter(a => a.id !== id); this.saveToStorage(); }
    async addTransaction(user: User, patientId: string, data: any) {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) throw new Error("Paciente não encontrado");

        const patient = this.patients[pIdx];

        // Deep clone the financial object to ensure reference change
        const financial: FinancialInfo = patient.financial ? { ...patient.financial } : { mode: 'PARTICULAR', transactions: [] };
        const transactions: FinancialTransaction[] = financial.transactions ? [...financial.transactions] : [];

        const newTrans: FinancialTransaction = {
            id: `tr-${Date.now()}`,
            ...data
        };

        transactions.unshift(newTrans);

        // Update patient immutably
        const updatedPatient: Patient = {
            ...patient,
            financial: {
                ...financial,
                transactions: transactions
            }
        };

        this.patients[pIdx] = updatedPatient;

        this.logPatientEvent(patientId, 'PAYMENT_RECORDED', { amount: data.amount }, `Pagamento registrado: R$${data.amount}`, user);
        this.saveToStorage();
        console.log(`[DB] Transação adicionada com sucesso para ${patientId}: R$${data.amount}`);
        return newTrans;
    }
    async updateTransaction(user: User, patientId: string, transactionId: string, updates: Partial<FinancialTransaction>) {
        const pIdx = this.patients.findIndex(p => p.id === patientId);
        if (pIdx === -1) throw new Error("Paciente não encontrado");

        const patient = this.patients[pIdx];
        if (!patient.financial?.transactions) throw new Error("Nenhuma transação encontrada");

        const tIdx = patient.financial.transactions.findIndex(t => t.id === transactionId);
        if (tIdx === -1) throw new Error("Transação não encontrada");

        const updatedTransactions = [...patient.financial.transactions];
        updatedTransactions[tIdx] = { ...updatedTransactions[tIdx], ...updates };

        this.patients[pIdx] = {
            ...patient,
            financial: {
                ...patient.financial,
                transactions: updatedTransactions
            }
        };

        if (updates.status) {
            this.logPatientEvent(patientId, 'PAYMENT_RECORDED', { transactionId, newStatus: updates.status }, `Status de pagamento alterado para ${updates.status}`, user);
        }

        await this.saveToStorage();
        return updatedTransactions[tIdx];
    }

    async addTimelineEvent(user: User, patientId: string, data: any) { /* ... impl ... */ }
    async deleteTimelineEvent(user: User, patientId: string, eventId: string) { /* ... impl ... */ }
    async saveClinicalNote(user: User, patientId: string, content: string) {
        const idx = this.patients.findIndex(p => p.id === patientId);
        if (idx === -1) throw new Error("Paciente não encontrado");

        const newNote: ClinicalNote = {
            id: `note-${Date.now()}`,
            date: new Date().toISOString(),
            authorName: user.name,
            content: content
        };

        if (!this.patients[idx].clinicalNotes) {
            this.patients[idx].clinicalNotes = [];
        }

        this.patients[idx].clinicalNotes!.unshift(newNote); // Adiciona no topo
        this.logPatientEvent(patientId, 'NOTE_ADDED', { noteId: newNote.id }, 'Nova nota clínica registrada', user);
        this.saveToStorage();
        return newNote;
    }
    async getExams(clinicId: string, patientId: string) { return this.exams.filter(e => e.patientId === patientId); }
    async uploadExam(user: User, patientId: string, meta: any) {
        /* ... impl ... */
        this.logPatientEvent(patientId, 'EXAM_UPLOADED', { name: meta.fileName }, 'Novo exame anexado', user);
        return {} as Exam;
    }

    async saveExam(user: User, patientId: string, examData: Partial<Exam>) {
        const id = Math.random().toString(36).substr(2, 9);
        const newExam: Exam = {
            id,
            clinicId: examData.clinicId || '',
            patientId,
            date: examData.date || new Date().toISOString(),
            name: examData.name || 'Exame',
            status: examData.status || 'PENDENTE',
            clinicalReason: examData.clinicalReason || '',
            requestedByUserId: user.id,
            createdAt: new Date().toISOString(),
            markers: examData.markers || [],
            healthScore: examData.healthScore,
            fileUrl: examData.fileUrl,
            clinicalHypothesis: examData.clinicalHypothesis || ''
        };

        this.exams.push(newExam);
        await this.saveToStorage();

        this.logPatientEvent(patientId, 'EXAM_UPLOADED', { id, name: newExam.name }, `Exame cadastrado: ${newExam.name}`, user);
        return newExam;
    }

    async updateExamAnalysis(examId: string, result: ExamAnalysisResult) {
        const idx = this.exams.findIndex(e => e.id === examId);
        if (idx !== -1) {
            this.exams[idx] = {
                ...this.exams[idx],
                status: 'ANALISADO',
                analysisResult: result,
                aiAnalysis: result.summary // Backward compatibility
            };
            await this.saveToStorage();
        }
    }

    async updateExam(examId: string, updates: Partial<Exam>) {
        const idx = this.exams.findIndex(e => e.id === examId);
        if (idx !== -1) {
            this.exams[idx] = { ...this.exams[idx], ...updates };
            await this.saveToStorage();
            return this.exams[idx];
        }
    }

    async deleteExam(examId: string) {
        this.exams = this.exams.filter(e => e.id !== examId);
        await this.saveToStorage();
    }

    // --- SOLICITAÇÃO DE EXAMES ---
    async getExamRequests(patientId: string) {
        return this.examRequests.filter(r => r.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async saveExamRequest(user: User, patientId: string, requestData: Partial<ExamRequest>) {
        const professional = this.professionals.find(p => p.id === user.professionalId);
        const id = `req-${Date.now()}`;
        const newRequest: ExamRequest = {
            id,
            clinicId: user.clinicId,
            patientId,
            professionalId: user.professionalId || '',
            authorName: professional?.name || user.name,
            authorRegistration: professional?.registrationNumber || '',
            date: requestData.date || new Date().toISOString().split('T')[0],
            exams: requestData.exams || [],
            clinicalIndication: requestData.clinicalIndication || '',
            complementaryInfo: requestData.complementaryInfo || '',
            fastingRequired: requestData.fastingRequired,
            fastingHours: requestData.fastingHours,
            medications: requestData.medications,
            createdAt: new Date().toISOString()
        };

        this.examRequests.push(newRequest);
        await this.saveToStorage();
        this.logPatientEvent(patientId, 'SOLICITACAO_EXAMES', { id, exams: newRequest.exams }, `Solicitação de exames gerada com ${newRequest.exams.length} itens`, user);
        return newRequest;
    }

    async deleteExamRequest(requestId: string) {
        this.examRequests = this.examRequests.filter(r => r.id !== requestId);
        await this.saveToStorage();
    }

    // --- NUTRITIONAL PLANNING PERSISTENCE (UPDATED FOR MULTI-PLAN) ---

    // Get all plans for a patient
    async listNutritionalPlans(patientId: string): Promise<NutritionalPlan[]> {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) throw new Error("Patient not found");

        // Ensure nutritionalPlans array exists or handle legacy singular plan
        if (!patient.nutritionalPlans || patient.nutritionalPlans.length === 0) {
            if (patient.nutritionalPlan) {
                // Return the legacy plan as a single-item array
                const legacyPlan = { ...patient.nutritionalPlan };
                if (!legacyPlan.id) legacyPlan.id = 'legacy-plan';
                return [legacyPlan];
            }
            patient.nutritionalPlans = [];
        }

        // Sort by updatedAt descending
        return [...patient.nutritionalPlans].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt).getTime();
            return dateB - dateA;
        });
    }

    // Upsert Logic (Supports both Create and Update based on ID existence)
    async upsertNutritionalPlan(user: User, patientId: string, plan: NutritionalPlan): Promise<NutritionalPlan> {
        const idx = this.patients.findIndex(p => p.id === patientId);
        if (idx === -1) throw new Error("Patient not found");

        if (!this.patients[idx].nutritionalPlans) {
            this.patients[idx].nutritionalPlans = [];
        }

        const now = new Date().toISOString();
        const existingPlanIdx = this.patients[idx].nutritionalPlans!.findIndex(p => p.id === plan.id);

        let savedPlan: NutritionalPlan;

        // Handle "Active" status logic: If this plan is active, others must be inactive
        if (plan.status === 'ATIVO') {
            this.patients[idx].nutritionalPlans!.forEach(p => {
                if (p.id !== plan.id) {
                    p.status = 'FINALIZADO'; // Demote previous active plan
                }
            });
        }

        if (existingPlanIdx >= 0) {
            // UPDATE Existing Plan
            savedPlan = {
                ...this.patients[idx].nutritionalPlans![existingPlanIdx],
                ...plan,
                updatedAt: now
            };
            this.patients[idx].nutritionalPlans![existingPlanIdx] = savedPlan;
            this.logPatientEvent(patientId, 'PLAN_UPDATED', { title: plan.title }, 'Plano nutricional atualizado', user);
        } else {
            // CREATE New Plan
            savedPlan = {
                ...plan,
                id: plan.id || `plan-${Date.now()}`, // Ensure ID if missing
                createdAt: now,
                updatedAt: now,
                title: plan.title || `Plano ${new Date().toLocaleDateString()}`
            };
            this.patients[idx].nutritionalPlans!.push(savedPlan);
            this.logPatientEvent(patientId, 'PLAN_CREATED', { title: plan.title }, 'Novo plano nutricional criado', user);
        }

        this.saveToStorage();
        return savedPlan;
    }

    // Get specific active plan (Legacy support + UI convenience)
    async getActiveNutritionalPlan(patientId: string): Promise<NutritionalPlan | null> {
        await this.delay(100);
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) return null;

        // If nutritionalPlans array is populated, prefer it
        if (patient.nutritionalPlans && patient.nutritionalPlans.length > 0) {
            // Return active plan, or the most recent one if no active plan exists
            return patient.nutritionalPlans.find(p => p.status === 'ATIVO') || patient.nutritionalPlans[patient.nutritionalPlans.length - 1];
        }

        // Fallback: support legacy singular nutritionalPlan field
        if (patient.nutritionalPlan) {
            return patient.nutritionalPlan;
        }

        return null;
    }

    // --- ANALYTICS / AI SNAPSHOT BUILDER (DETERMINISTIC) ---
    // Calculates real totals and formats data for AI consumption
    async buildNutritionPlanSnapshot(user: User, patientId: string): Promise<PlanSnapshot | null> {
        const plan = await this.getActiveNutritionalPlan(patientId);
        const patient = this.patients.find(p => p.id === patientId);
        const clinic = this.clinics.find(c => c.id === user.clinicId);
        const professional = this.professionals.find(p => p.id === user.professionalId);

        if (!plan || !patient) return null;

        // 1. Calculate Totals Deterministically (Source of Truth)
        const dailyTotals = NutrientCalc.calculateDailyTotals(plan.meals);

        // 2. Aggregate Micros for Snapshot
        const micros: Record<string, number> = {
            sodium: dailyTotals.sodium,
            calcium: dailyTotals.calcium,
            iron: dailyTotals.iron,
            potassium: dailyTotals.potassium,
            vitaminC: dailyTotals.vitaminC,
            fiber: dailyTotals.fiber
        };

        // 3. Construct Snapshot
        const snapshot: PlanSnapshot = {
            clinic: clinic ? {
                name: clinic.name,
                logoUrl: clinic.logoUrl
            } : undefined,
            professional: professional ? {
                name: professional.name,
                registration: professional.registrationNumber,
                specialty: professional.specialty
            } : undefined,
            patient: {
                name: patient.name,
                age: this.calculateAge(patient.birthDate),
                gender: patient.gender,
                diagnoses: patient.clinicalSummary?.activeDiagnoses || [],
                objective: patient.clinicalSummary?.clinicalGoal || 'Manutenção da saúde',
                activityFactor: plan.inputsUsed?.activityFactor ?? 1.55,
                kcalTarget: plan.caloricTarget ?? 0,
                macroTargets: {
                    protein: plan.macroTargets?.protein?.g ?? 0,
                    carbs: plan.macroTargets?.carbs?.g ?? 0,
                    fat: plan.macroTargets?.fat?.g ?? 0
                },
                leanMass: patient.anthropometry?.leanMass,
                bodyFatPct: patient.anthropometry?.bodyFatPercentage
            },
            plan: {
                id: plan.id || 'legacy-plan',
                title: plan.title || 'Plano Atual',
                meals: plan.meals || []
            },
            totals: {
                kcal: dailyTotals.calories,
                protein: dailyTotals.protein,
                carbs: dailyTotals.carbs,
                fat: dailyTotals.fat,
                fiber: dailyTotals.fiber,
                micros: micros
            },
            dataQuality: {
                missingMicrosCount: 0,
                itemsWithUnknownDensity: 0
            }
        };

        return snapshot;
    }

    /**
     * ROBUST ANTHROPOMETRY SNAPSHOT BUILDER
     */
    async getAnthroSnapshot(patientId: string, overridePatient?: Partial<Patient>): Promise<{ snapshot: AnthroSnapshot | null, source: 'record' | 'patient' | 'none', warnings: string[] }> {
        const dbPatient = this.patients.find(p => p.id === patientId);

        // Merge strategy: Start with DB patient, overlay override if provided.
        // This ensures we have basic info like name/birthDate even if override is partial.
        const patient = dbPatient ? { ...dbPatient, ...overridePatient } : (overridePatient as Patient);

        if (!patient) {
            return { snapshot: null, source: 'none', warnings: ['Paciente não encontrado.'] };
        }

        // Check where the anthropometry data is coming from
        let anthro = patient.anthropometry;
        let source: 'record' | 'patient' = 'record';

        // If override provided and has weight, assume it's from UI (patient source)
        if (overridePatient && overridePatient.anthropometry && overridePatient.anthropometry.weight) {
            anthro = overridePatient.anthropometry;
            source = 'patient';
        } else if (!anthro && dbPatient?.anthropometry) {
            // Fallback to DB if override didn't have anthro
            anthro = dbPatient.anthropometry;
        }

        if (!anthro || !anthro.weight || !anthro.height) {
            return { snapshot: null, source: 'none', warnings: ['Dados insuficientes: Peso e Altura são obrigatórios.'] };
        }

        const warnings: string[] = [];
        if (source === 'patient') warnings.push("Usando dados da tela (não salvos).");

        const age = this.calculateAge(patient.birthDate);

        // --- 1. Unit Normalization (Anti-NaN) ---
        let heightM = typeof anthro.height === 'number' ? anthro.height : parseFloat(anthro.height as any);
        let heightCm = 0;

        if (isNaN(heightM)) {
            return { snapshot: null, source: 'none', warnings: ['Altura inválida.'] };
        }

        // Logic: If height < 3, assume meters. If > 3, assume cm.
        if (heightM > 3 && heightM <= 300) {
            heightCm = heightM;
            heightM = heightM / 100;
        } else {
            heightCm = heightM * 100;
        }

        // --- 2. Deterministic Calculation ---
        let bmi = 0;
        if (anthro.weight && heightM > 0) {
            bmi = parseFloat((anthro.weight / (heightM * heightM)).toFixed(1));
        }

        let bodyFatPercentage = 0;
        let bodyDensity = 0;
        const protocol = anthro.skinfoldProtocol || 'JacksonPollock7';

        const {
            skinfoldChest, skinfoldAbdominal, skinfoldThigh, skinfoldTriceps,
            skinfoldSubscapular, skinfoldSuprailiac, skinfoldAxillary, skinfoldBiceps
        } = anthro as any;

        try {
            // Simplified required folds logic for DB (mapping to SKINFOLD_PROTOCOLS labels conceptually)
            const PROTOCOL_REQUIREMENTS: Record<string, string[]> = {
                JacksonPollock7: ['skinfoldChest', 'skinfoldAbdominal', 'skinfoldThigh', 'skinfoldTriceps', 'skinfoldSubscapular', 'skinfoldSuprailiac', 'skinfoldAxillary'],
                JacksonPollock3: (patient.gender === 'Masculino') ? ['skinfoldChest', 'skinfoldAbdominal', 'skinfoldThigh'] : ['skinfoldTriceps', 'skinfoldSuprailiac', 'skinfoldThigh'],
                Guedes: (patient.gender === 'Masculino') ? ['skinfoldTriceps', 'skinfoldSuprailiac', 'skinfoldAbdominal'] : ['skinfoldThigh', 'skinfoldSuprailiac', 'skinfoldSubscapular'],
                DurninWomersley: ['skinfoldBiceps', 'skinfoldTriceps', 'skinfoldSubscapular', 'skinfoldSuprailiac'],
                Faulkner: ['skinfoldTriceps', 'skinfoldSubscapular', 'skinfoldSuprailiac', 'skinfoldAbdominal']
            };

            const required = PROTOCOL_REQUIREMENTS[protocol];
            const hasAllData = required ? required.every(f => typeof (anthro as any)[f] === 'number' && (anthro as any)[f] > 0) : false;

            if (hasAllData && age > 0) {
                const sum = required!.reduce((s, f) => s + ((anthro as any)[f] || 0), 0);

                if (protocol === 'JacksonPollock7') {
                    if (patient.gender === 'Masculino') {
                        bodyDensity = 1.112 - (0.00043499 * sum) + (0.00000055 * Math.pow(sum, 2)) - (0.00028826 * age);
                    } else {
                        bodyDensity = 1.097 - (0.00046971 * sum) + (0.00000056 * Math.pow(sum, 2)) - (0.00012828 * age);
                    }
                } else if (protocol === 'JacksonPollock3') {
                    if (patient.gender === 'Masculino') {
                        bodyDensity = 1.10938 - (0.0008267 * sum) + (0.0000016 * Math.pow(sum, 2)) - (0.0002574 * age);
                    } else {
                        bodyDensity = 1.0994921 - (0.0009929 * sum) + (0.0000023 * Math.pow(sum, 2)) - (0.0001392 * age);
                    }
                } else if (protocol === 'Guedes') {
                    if (patient.gender === 'Masculino') {
                        bodyDensity = 1.17136 - (0.06706 * Math.log10(sum));
                    } else {
                        bodyDensity = 1.16650 - (0.07063 * Math.log10(sum));
                    }
                } else if (protocol === 'DurninWomersley') {
                    let c = 0, m = 0;
                    if (patient.gender === 'Masculino') {
                        if (age < 20) { c = 1.1620; m = 0.0630; }
                        else if (age < 30) { c = 1.1631; m = 0.0632; }
                        else if (age < 40) { c = 1.1422; m = 0.0544; }
                        else if (age < 50) { c = 1.1620; m = 0.0700; } // FIXED CONSTANT
                        else { c = 1.1715; m = 0.0779; }
                    } else {
                        if (age < 20) { c = 1.1549; m = 0.0678; }
                        else if (age < 30) { c = 1.1599; m = 0.0717; }
                        else if (age < 40) { c = 1.1423; m = 0.0632; }
                        else if (age < 50) { c = 1.1333; m = 0.0612; }
                        else { c = 1.1339; m = 0.0645; }
                    }
                    bodyDensity = c - (m * Math.log10(sum));
                } else if (protocol === 'Faulkner') {
                    bodyFatPercentage = (sum * 0.153) + 5.783;
                }

                if (bodyDensity > 0 && protocol !== 'Faulkner') {
                    bodyFatPercentage = (495 / bodyDensity) - 450;
                }

                // Reliability Guard: prevent unrealistic results from bad inputs
                if (bodyFatPercentage < 2 || bodyFatPercentage > 75) {
                    bodyFatPercentage = 0;
                }
            }
        } catch (e) {
            console.error("Anthro calculation error in DB service", e);
        }

        const bodyFatPct = Math.max(0, parseFloat(bodyFatPercentage.toFixed(1)));

        const fatMassKg = (anthro.weight && bodyFatPct) ? parseFloat(((anthro.weight * bodyFatPct) / 100).toFixed(1)) : 0;
        const leanMassKg = (anthro.weight && fatMassKg) ? parseFloat((anthro.weight - fatMassKg).toFixed(1)) : 0;

        const whr = (anthro.circWaist && anthro.circHip) ? parseFloat((anthro.circWaist / anthro.circHip).toFixed(2)) : 0;

        // --- 3. Build Snapshot ---
        const snapshot: AnthroSnapshot = {
            patient: {
                name: patient.name,
                gender: patient.gender,
                age: age
            },
            anthro: {
                date: new Date().toISOString(), // Current analysis time or record time
                weightKg: anthro.weight,
                heightM: heightM,
                circumferencesCm: {
                    neck: anthro.circNeck || null,
                    chest: anthro.circChest || null,
                    waist: anthro.circWaist || null,
                    abdomen: anthro.circAbdomen || null,
                    hip: anthro.circHip || null,
                    arm: anthro.circArmContracted || null,
                    thigh: anthro.circThigh || null,
                    calf: anthro.circCalf || null
                },
                skinfoldsMm: {
                    chest: anthro.skinfoldChest || null,
                    midaxillary: anthro.skinfoldAxillary || null,
                    triceps: anthro.skinfoldTriceps || null,
                    subscapular: anthro.skinfoldSubscapular || null,
                    abdominal: anthro.skinfoldAbdominal || null,
                    suprailiac: anthro.skinfoldSuprailiac || null,
                    thigh: anthro.skinfoldThigh || null
                },
                bodyComp: {
                    bmi,
                    bodyFatPct,
                    fatMassKg,
                    leanMassKg,
                    whr
                }
            },
            clinical: {
                objective: patient.clinicalSummary?.clinicalGoal || '',
                activeDiagnoses: patient.clinicalSummary?.activeDiagnoses || []
            }
        };

        return { snapshot, source, warnings };
    }

    // Legacy Wrapper for backward compatibility (deprecate usage over time)
    async buildAnthroSnapshot(patientId: string): Promise<AnthroSnapshot | null> {
        const result = await this.getAnthroSnapshot(patientId);
        return result.snapshot;
    }

    // Kept for backward compatibility, but UI should now use aiPlanAnalysis service
    async analyzeNutritionPlanWithAI(user: User, snapshot: any) {
        return { summary: "Use o novo serviço de IA.", priority_fixes: [], meal_notes: [], data_gaps: [] };
    }

    async improveTextWithAI(text: string) {
        if (!this.ai) return text + " (IA Offline)";
        try {
            const prompt = `Você é um assistente de nutrição clínica especializado em terminologia técnica. 
            Melhore o texto a seguir, convertendo descrições simples em termos técnicos médicos e nutricionais adequados para um prontuário.
            Mantenha o sentido original e seja conciso. Não adicione informações que não estão no texto original.
            
            Texto: ${text}`;

            const result = await (this.ai as any).models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt
            });

            return result.text || text;
        } catch (error) {
            console.error("Erro ao melhorar texto com IA:", error);
            return text + " (Erro IA)";
        }
    }

    async analyzeExamWithAI(user: User, id: string) {
        const examIdx = this.exams.findIndex(e => e.id === id);
        if (examIdx === -1) throw new Error("Exame não encontrado.");

        const exam = this.exams[examIdx];

        if (!this.ai) {
            this.exams[examIdx] = {
                ...exam,
                status: 'ANALISADO',
                aiAnalysis: "Análise processada em modo offline. O sistema detectou marcadores estáveis, porém recomenda-se avaliação clínica presencial.",
                markers: (exam.markers || []).map(m => ({ ...m, interpretation: 'NORMAL' }))
            };
            this.saveToStorage();
            return;
        }

        try {
            const prompt = `Analise este exame laboratorial de forma clínica para um nutricionista.
            Nome do Exame: ${exam.name}
            Motivo: ${exam.clinicalReason}
            Hipótese: ${exam.clinicalHypothesis}
            
            Retorne um JSON com o seguinte formato:
            {
                "summary": "Resumo clínico curto",
                "markers": [
                    {"name": "Nome", "value": "Valor", "reference": "Ref", "interpretation": "NORMAL|ALTERADO|LIMITROFE"}
                ]
            }`;

            const result = await (this.ai as any).models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const analysis = JSON.parse(result.text.trim());

            this.exams[examIdx] = {
                ...exam,
                status: 'ANALISADO',
                aiAnalysis: analysis.summary,
                markers: analysis.markers
            };
            this.saveToStorage();
        } catch (error) {
            console.error("Erro na análise de exame com IA:", error);
            throw error;
        }
    }

    // Updated signature to match usage but returns string for backward compat
    async analyzeAnthropometryWithAI(patient: Patient, anthro: Anthropometry) {
        // This is the legacy entry point. Ideally the UI calls the new service directly.
        return "Use o novo botão de análise.";
    }

    // --- DASHBOARD ANALYTICS (FIXED BUG) ---
    async getAdvancedStats(clinicId: string, professionalId?: string, forceMode: 'ADMIN' | 'PROFESSIONAL' = 'PROFESSIONAL') {
        // Use standard getter with correct forceMode to respect privacy
        const patients = await this.getPatients(clinicId, professionalId, forceMode);
        const appointments = await this.getAppointments(clinicId, new Date('2000-01-01'), new Date('2100-01-01'), professionalId, forceMode);

        const activePatients = patients.filter(p => p.status === 'ATIVO').length;

        // Calculate Revenue based on transactions
        let revenue = 0;
        let paidTransactionsCount = 0;
        patients.forEach(p => {
            if (p.financial?.transactions) {
                const paid = p.financial.transactions.filter(t => t.status === 'PAGO');
                revenue += paid.reduce((sum, t) => sum + t.amount, 0);
                paidTransactionsCount += paid.length;
            }
        });

        const ticketMedio = paidTransactionsCount > 0 ? revenue / paidTransactionsCount : 0;

        // No Show Rate (MISSED status)
        const totalAppts = appointments.length;
        const missedAppts = appointments.filter(a => a.status === AppointmentStatus.MISSED).length;
        const noShowRate = totalAppts > 0 ? Math.round((missedAppts / totalAppts) * 100) : 0;

        // Gender Distribution
        const genderDistribution = {
            Masculino: patients.filter(p => p.gender === 'Masculino').length,
            Feminino: patients.filter(p => p.gender === 'Feminino').length
        };

        // Top Pathologies
        const pathologyMap: Record<string, number> = {};
        patients.forEach(p => {
            p.clinicalSummary?.activeDiagnoses?.forEach(d => {
                pathologyMap[d] = (pathologyMap[d] || 0) + 1;
            });
            p.clinicalHistory?.pathologies?.forEach(d => {
                pathologyMap[d] = (pathologyMap[d] || 0) + 1;
            });
        });
        const topPathologies = Object.entries(pathologyMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            revenue,
            ticketMedio,
            activePatients,
            appointmentsCount: totalAppts,
            noShowRate,
            genderDistribution,
            topPathologies
        };
    }

    async generateDashboardInsights(id: string, stats: any) {
        // Basic deterministic insights
        if (stats.noShowRate > 20) return { insight: "Taxa de faltas crítica (>20%).", action: "Implementar confirmação via WhatsApp." };
        if (stats.revenue === 0) return { insight: "Nenhum faturamento registrado.", action: "Comece a lançar pagamentos nos pacientes." };
        return { insight: "Indicadores estáveis.", action: "Manter monitoramento." };
    }

    async getReportData(id: string, start: string, end: string, pid?: string) {
        const startDate = new Date(start + (start.includes('T') ? '' : 'T00:00:00'));
        const endDate = new Date(end + (end.includes('T') ? '' : 'T23:59:59'));

        return this.appointments.filter(a => {
            if (a.clinicId !== id) return false;
            if (pid && pid !== 'all' && a.professionalId !== pid) return false;
            const apptDate = new Date(a.startTime);
            return apptDate >= startDate && apptDate <= endDate;
        }).map(a => {
            const p = this.patients.find(pt => pt.id === a.patientId);
            const prof = this.professionals.find(pr => pr.id === a.professionalId);

            let age: string | number = '-';
            if (p?.birthDate) {
                const birth = new Date(p.birthDate);
                age = new Date().getFullYear() - birth.getFullYear();
            }

            return {
                ...a,
                date: a.startTime,
                patientName: p?.name || 'Desconhecido',
                professionalName: prof?.name || 'Desconhecido',
                patientGender: p?.gender || '-',
                patientAge: age,
                insurance: p?.financial?.mode === 'CONVENIO' ? p.financial.insuranceName : 'Particular',
                pathologies: p?.clinicalSummary?.activeDiagnoses?.join(', ') || '-'
            };
        });
    }

    async getOperationalReportDataset(id: string, start: string, end: string, pid?: string) {
        const startCurrent = new Date(start + 'T00:00:00');
        const endCurrent = new Date(end + 'T23:59:59');
        const durationMs = endCurrent.getTime() - startCurrent.getTime();

        const startPrev = new Date(startCurrent.getTime() - durationMs - 1);
        const endPrev = new Date(startCurrent.getTime() - 1);
        const startPrevStr = startPrev.toISOString().split('T')[0];
        const endPrevStr = endPrev.toISOString().split('T')[0];

        const appointments = await this.getReportData(id, start, end, pid);
        const appointmentsPrev = await this.getReportData(id, startPrevStr, endPrevStr, pid);

        const patientsInBase = await this.getPatients(id, pid, (pid && pid !== 'all') ? 'PROFESSIONAL' : 'ADMIN');

        // Grouping by professional
        const profMetrics: Record<string, { current: number, prev: number }> = {};
        appointments.forEach(a => {
            const name = a.professionalName || 'Outro';
            if (!profMetrics[name]) profMetrics[name] = { current: 0, prev: 0 };
            profMetrics[name].current++;
        });
        appointmentsPrev.forEach(a => {
            const name = a.professionalName || 'Outro';
            if (!profMetrics[name]) profMetrics[name] = { current: 0, prev: 0 };
            profMetrics[name].prev++;
        });

        const uniquePatientsCurrent = new Set(appointments.map(a => a.patientId)).size;
        const uniquePatientsPrev = new Set(appointmentsPrev.map(a => a.patientId)).size;

        return {
            appointments,
            stats: {
                activePatients: patientsInBase.length,
                totalActivities: appointments.length,
                uniquePatientsInPeriod: uniquePatientsCurrent,
                professionalPerformance: Object.entries(profMetrics).map(([name, data]) => ({ name, ...data }))
            },
            comparative: {
                totalActivities: appointmentsPrev.length,
                uniquePatients: uniquePatientsPrev
            },
            patientsInBase
        };
    }

    async getFinancialReportData(id: string, start: string, end: string) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const results: any[] = [];
        this.patients.forEach(p => {
            if (p.clinicId !== id) return;
            if (p.financial && p.financial.transactions) {
                p.financial.transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate >= startDate && tDate <= endDate) {
                        results.push({
                            ...t,
                            patientId: p.id,
                            patientName: p.name
                        });
                    }
                });
            }
        });
        return results;
    }

    async getFinancialReportDataset(id: string, start: string, end: string) {
        const startCurrent = new Date(start + 'T00:00:00');
        const endCurrent = new Date(end + 'T23:59:59');
        const durationMs = endCurrent.getTime() - startCurrent.getTime();

        const startPrev = new Date(startCurrent.getTime() - durationMs - 1);
        const endPrev = new Date(startCurrent.getTime() - 1);
        const startPrevStr = startPrev.toISOString().split('T')[0];
        const endPrevStr = endPrev.toISOString().split('T')[0];

        const transactions = await this.getFinancialReportData(id, start, end);
        const appointments = await this.getReportData(id, start, end); // Basic appointments filtered by clinic

        const transactionsPrev = await this.getFinancialReportData(id, startPrevStr, endPrevStr);
        const appointmentsPrev = await this.getReportData(id, startPrevStr, endPrevStr);

        // Fees Mapping (simulated/industry average)
        const FEES = {
            'PIX': 0,
            'DINHEIRO': 0,
            'CARTAO_DEBITO': 0.019,
            'CARTAO_CREDITO': 0.035,
            'BOLETO': 0.025,
            'GUIA_CONVENIO': 0.15
        };

        const calculateMetrics = (txs: any[], appts: any[]) => {
            const gross = txs.reduce((acc, t) => acc + (t.originalAmount || t.amount), 0);
            const netReal = txs.reduce((acc, t) => {
                const fee = FEES[t.method as keyof typeof FEES] || 0;
                const amt = t.status === 'PAGO' ? t.amount : 0;
                return acc + (amt * (1 - fee));
            }, 0);
            const discount = txs.reduce((acc, t) => acc + ((t.originalAmount || t.amount) - t.amount), 0);
            const confirmedAmount = txs.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0);
            const pendingAmount = txs.filter(t => t.status === 'PENDENTE').reduce((acc, t) => acc + t.amount, 0);

            const isRealized = (s: any) => s === AppointmentStatus.COMPLETED || s === 'COMPLETED' || s === AppointmentStatus.CONFIRMED || s === 'CONFIRMED' || s === 'REALIZADO';
            const isMissed = (s: any) => s === AppointmentStatus.MISSED || s === 'FALTA' || s === 'MISSED' || s === AppointmentStatus.CANCELED || s === 'CANCELED';

            const realizedAppts = appts.filter(a => isRealized(a.status));
            const missedAppts = appts.filter(a => isMissed(a.status));

            const ticketMedio = realizedAppts.length > 0 ? (gross / realizedAppts.length) : 0;
            const lostRevenue = missedAppts.length * ticketMedio;
            const conversionRate = appts.length > 0 ? (realizedAppts.length / appts.length) * 100 : 0;
            const discountIndex = gross > 0 ? (discount / gross) * 100 : 0;

            return {
                gross, netReal, discount, confirmedAmount, pendingAmount,
                ticketMedio, lostRevenue, conversionRate, discountIndex,
                totalAppts: appts.length, realizedCount: realizedAppts.length, missedCount: missedAppts.length
            };
        };

        const currentMetrics = calculateMetrics(transactions, appointments);
        const prevMetrics = calculateMetrics(transactionsPrev, appointmentsPrev);

        // Aging of Receivables (Pendente)
        const now = new Date();
        const aging = transactions.filter(t => t.status === 'PENDENTE').reduce((acc, t) => {
            const diffDays = Math.floor((now.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 15) acc['0-15'] += t.amount;
            else if (diffDays <= 30) acc['16-30'] += t.amount;
            else acc['30+'] += t.amount;
            return acc;
        }, { '0-15': 0, '16-30': 0, '30+': 0 });

        return {
            transactions,
            metrics: currentMetrics,
            comparative: prevMetrics,
            aging,
            fees: FEES
        };
    }

    async getAttendanceReportData(id: string, start: string, end: string, pid?: string) {
        const startCurrent = new Date(start + (start.includes('T') ? '' : 'T00:00:00'));
        const endCurrent = new Date(end + (end.includes('T') ? '' : 'T23:59:59'));
        const durationMs = endCurrent.getTime() - startCurrent.getTime();

        // Dynamic previous period for comparison
        const startPrev = new Date(startCurrent.getTime() - durationMs - 1);
        const endPrev = new Date(startCurrent.getTime() - 1);
        const startPrevStr = startPrev.toISOString().split('T')[0];
        const endPrevStr = endPrev.toISOString().split('T')[0];

        const apptsCurrent = await this.getReportData(id, start, end, pid);
        const apptsPrev = await this.getReportData(id, startPrevStr, endPrevStr, pid);

        const total = apptsCurrent.length;
        const isMissed = (s: any) => s === AppointmentStatus.MISSED || s === 'FALTA' || s === 'MISSED' || s === AppointmentStatus.CANCELED || s === 'CANCELED';

        const missed = apptsCurrent.filter(a => isMissed(a.status)).length;
        const noShowRate = total > 0 ? Math.round((missed / total) * 100) : 0;

        const totalPrev = apptsPrev.length;
        const missedPrev = apptsPrev.filter(a => isMissed(a.status)).length;
        const noShowRatePrev = totalPrev > 0 ? Math.round((missedPrev / totalPrev) * 100) : 0;

        const variation = noShowRatePrev === 0 ? 0 : Math.round(((noShowRate - noShowRatePrev) / noShowRatePrev) * 100);

        // Calculate actual loss based on average ticket if available
        let avgTicket = 150; // default
        const clinic = this.clinics.find(c => c.id === id);
        if (clinic) {
            // Find paid appointments in current period to get real average
            const paidCurrent = apptsCurrent.filter(a => a.financialStatus === 'PAGO' && a.price);
            if (paidCurrent.length > 0) {
                avgTicket = paidCurrent.reduce((acc, a) => acc + (a.price || 0), 0) / paidCurrent.length;
            }
        }

        const estimatedImpact = missed * avgTicket;

        // Identify "Chronic" no-showers
        const patientNoShowCount: Record<string, number> = {};
        apptsCurrent.filter(a => isMissed(a.status)).forEach(a => {
            patientNoShowCount[a.patientId] = (patientNoShowCount[a.patientId] || 0) + 1;
        });

        const patientsAtRisk = Object.entries(patientNoShowCount)
            .map(([pid, count]) => {
                const p = this.patients.find(pt => pt.id === pid);
                return {
                    id: pid,
                    name: p?.name || 'Desconhecido',
                    count,
                    reason: count > 1 ? `Reincidente: ${count} faltas no período.` : 'Faltou à consulta agendada.'
                };
            })
            .sort((a, b) => b.count - a.count);

        const churnRisk = patientsAtRisk.map(p => ({
            id: p.id,
            name: p.name,
            missedCount: p.count,
            lastVisit: 'Recentemente' // Simplified for mock
        }));

        return {
            stats: { total, missed, noShowRate, variation, previousRate: noShowRatePrev },
            financial: { estimatedImpact, avgTicket },
            risk: { patientsAtRisk },
            churnRisk: churnRisk
        };
    }

    async generateReportCrossAnalysis(id: string, data: any[]) {
        if (!this.ai) return { clinicalAnalysis: "IA Offline. Analise os dados manualmente.", strategicSuggestions: ["Monitorar fluxo de pacientes", "Otimizar agenda"] };
        try {
            const stats = {
                total: data.length,
                types: data.reduce((acc, a) => ({ ...acc, [a.type]: (acc[a.type] || 0) + 1 }), {}),
                insurances: data.reduce((acc, a) => ({ ...acc, [a.insurance]: (acc[a.insurance] || 0) + 1 }), {}),
                avgAge: Math.round(data.reduce((acc, a) => acc + (typeof a.patientAge === 'number' ? a.patientAge : 0), 0) / data.length)
            };

            const prompt = `Você é um consultor estratégico de gestão de clínicas de saúde (ControlClin). 
            Analise os seguintes dados operacionais e forneça um resumo analítico para o GESTOR.
            
            Dados: ${JSON.stringify(stats)}
            
            Retorne um JSON no formato:
            {
                "clinicalAnalysis": "Uma frase analítica sobre o perfil da clínica e fluxo",
                "strategicSuggestions": ["Sugestão 1 de negócio", "Sugestão 2 de marketing/operação"]
            }`;

            const result = await (this.ai as any).models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            return JSON.parse(result.text.trim());
        } catch (e) {
            console.error("AI Operational Error", e);
            return null;
        }
    }

    async generateFinancialAnalysis(id: string, dataset: any) {
        if (!this.ai) return { financialHealth: "IA Offline.", revenueAction: "Revisar transações pendentes." };
        try {
            const { metrics, aging, transactions } = dataset;

            const methods = transactions.reduce((acc: any, t: any) => ({ ...acc, [t.method]: (acc[t.method] || 0) + 1 }), {});
            const pendingRatio = metrics.gross > 0 ? (metrics.pendingAmount / metrics.gross) * 100 : 0;

            const prompt = `Aja como um Analista Financeiro Senior de Clínicas Médicas. 
            Analise os dados abaixo do período atual:
            - Receita Bruta: R$${metrics.gross.toFixed(2)}
            - Receita Líquida Real (após taxas): R$${metrics.netReal.toFixed(2)}
            - Ticket Médio por Procedimento: R$${metrics.ticketMedio.toFixed(2)}
            - Taxa de Conversão de Agendamentos: ${metrics.conversionRate.toFixed(1)}%
            - Custo de Oportunidade (Faltas): R$${metrics.lostRevenue.toFixed(2)}
            - Índice de Desconto Médio: ${metrics.discountIndex.toFixed(1)}%
            - Inadimplência Atual: R$${metrics.pendingAmount.toFixed(2)} (${pendingRatio.toFixed(1)}% do total)
            - Aging de Recebíveis: 0-15d: R$${aging['0-15']}, 16-30d: R$${aging['16-30']}, 30d+: R$${aging['30+']}
            - Volume Métodos: ${JSON.stringify(methods)}
            
            Com base nestes dados:
            1. Avalie a saúde do faturamento e fluxo de caixa.
            2. Identifique gargalos de lucratividade (descontos, taxas ou faltas).
            3. Sugira uma ação comercial imediata e pragmática.

            Retorne um JSON estritamente neste formato:
            {
                "financialHealth": "Análise técnica curta (máx 3 frases) sobre saúde financeira.",
                "revenueAction": "Ação comercial/operacional direta."
            }`;

            const result = await (this.ai as any).models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            return JSON.parse(result.text.trim());
        } catch (e) {
            return null;
        }
    }

    async generateAttendanceInsights(data: any) {
        if (!this.ai) return { insight: "IA Offline.", action: "Revisar lista de riscos." };
        try {
            const prompt = `Analise o Absenteísmo da Clínica:
            Total: ${data.stats.total}
            Taxas de Falta: ${data.stats.noShowRate}% (Variação: ${data.stats.variation}%)
            Impacto Financeiro: R$${data.financial.estimatedImpact}
            
            Retorne um JSON:
            {
                "insight": "Causa provável do absenteísmo baseada nos números",
                "action": "Estratégia prática para reduzir cancelamentos"
            }`;

            const result = await (this.ai as any).models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            return JSON.parse(result.text.trim());
        } catch (e) {
            return null;
        }
    }

    // New AI hook for report summary
    async generateComprehensivePatientAISummary(data: IndividualReportSnapshot): Promise<string> {
        // Placeholder: UI calls the specific service.
        return "Use o serviço AIClinicalSummary.";
    }

    async getClinicalAlerts(id: string, pid?: string) {
        let list = this.alerts.filter(a => a.clinicId === id && a.status === 'ACTIVE');

        if (pid && pid !== 'all') {
            // Filter list to include only patients that belong to this professional
            const professionalPatientIds = new Set(
                this.patients
                    .filter(p => p.professionalId === pid)
                    .map(p => p.id)
            );
            return list.filter(a => professionalPatientIds.has(a.patientId));
        }

        return list;
    }

    async generateClinicalAlerts(id: string) {
        let newAlertsCount = 0;
        const today = new Date();

        this.patients.forEach(patient => {
            if (patient.clinicId !== id || patient.status !== 'ATIVO') return;

            // 1. Logic for ANTHROMETRY_OVERDUE (Eval > 30 days)
            const history = patient.anthropometryHistory || [];
            if (history.length > 0) {
                const historyDates = history.map(h => new Date(h.date).getTime());
                const lastDate = new Date(Math.max(...historyDates));
                const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 30) {
                    const existing = this.alerts.find(a =>
                        a.patientId === patient.id &&
                        a.type === 'ANTHROMETRY_OVERDUE' &&
                        a.status === 'ACTIVE'
                    );

                    if (!existing) {
                        this.alerts.push({
                            id: 'alt_' + Math.random().toString(36).substr(2, 9),
                            clinicId: id,
                            patientId: patient.id,
                            patientName: patient.name,
                            type: 'ANTHROMETRY_OVERDUE',
                            severity: 'MEDIUM',
                            description: `Paciente está há ${diffDays} dias sem nova avaliação antropométrica.`,
                            createdAt: today.toISOString(),
                            status: 'ACTIVE'
                        });
                        newAlertsCount++;
                    }
                }
            }

            // 2. Logic for RETURN_OVERDUE (Last appt > 45 days, and NO future appt)
            const patientAppts = this.appointments.filter(a => a.patientId === patient.id);
            const pastAppts = patientAppts.filter(a => new Date(a.startTime).getTime() < today.getTime());
            const futureAppts = patientAppts.filter(a => new Date(a.startTime).getTime() > today.getTime() && a.status !== 'CANCELADO');

            if (pastAppts.length > 0 && futureAppts.length === 0) {
                const lastApptDate = new Date(Math.max(...pastAppts.map(a => new Date(a.startTime).getTime())));
                const diffDays = Math.ceil((today.getTime() - lastApptDate.getTime()) / (1000 * 3600 * 24));

                if (diffDays > 45) {
                    const existing = this.alerts.find(a => a.patientId === patient.id && a.type === 'RETURN_OVERDUE' && a.status === 'ACTIVE');
                    if (!existing) {
                        this.alerts.push({
                            id: 'alt_' + Math.random().toString(36).substr(2, 9),
                            clinicId: id,
                            patientId: patient.id,
                            patientName: patient.name,
                            type: 'RETURN_OVERDUE',
                            severity: 'HIGH',
                            description: `Paciente realizou última consulta há ${diffDays} dias e não possui retorno agendado.`,
                            createdAt: today.toISOString(),
                            status: 'ACTIVE'
                        });
                        newAlertsCount++;
                    }
                }
            }

            // 3. Logic for EXAM_ATTENTION (Exam uploaded in last 15 days, no appt since)
            const patientExams = this.exams.filter(e => e.patientId === patient.id);
            if (patientExams.length > 0) {
                const newestExam = patientExams.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const examDate = new Date(newestExam.date);
                const diffDays = Math.ceil((today.getTime() - examDate.getTime()) / (1000 * 3600 * 24));

                if (diffDays < 15) {
                    // Check if there was an appt AFTER the exam
                    const apptAfterExam = pastAppts.find(a => new Date(a.startTime).getTime() > examDate.getTime());
                    if (!apptAfterExam) {
                        const existing = this.alerts.find(a => a.patientId === patient.id && a.type === 'EXAM_ATTENTION' && a.status === 'ACTIVE');
                        if (!existing) {
                            this.alerts.push({
                                id: 'alt_' + Math.random().toString(36).substr(2, 9),
                                clinicId: id,
                                patientId: patient.id,
                                patientName: patient.name,
                                type: 'EXAM_ATTENTION',
                                severity: 'MEDIUM',
                                description: `Novo exame anexado em ${examDate.toLocaleDateString('pt-BR')} sem consulta de revisão realizada.`,
                                createdAt: today.toISOString(),
                                status: 'ACTIVE'
                            });
                            newAlertsCount++;
                        }
                    }
                }
            }

            // 4. Logic for APP_NOT_LIBERATED (No appLiberadoEm and First appt > 36h)
            if (!patient.appLiberadoEm && pastAppts.length > 0) {
                const firstApptDate = new Date(Math.min(...pastAppts.map(a => new Date(a.startTime).getTime())));
                const diffHours = (today.getTime() - firstApptDate.getTime()) / (1000 * 3600);

                if (diffHours > 36) {
                    const existing = this.alerts.find(a => a.patientId === patient.id && a.type === 'APP_NOT_LIBERATED' && a.status === 'ACTIVE');
                    if (!existing) {
                        this.alerts.push({
                            id: 'alt_' + Math.random().toString(36).substr(2, 9),
                            clinicId: id,
                            patientId: patient.id,
                            patientName: patient.name,
                            type: 'APP_NOT_LIBERATED',
                            severity: 'HIGH',
                            description: `O acesso ao App do paciente não foi liberado (primeira consulta há mais de 36 horas).`,
                            createdAt: today.toISOString(),
                            status: 'ACTIVE'
                        });
                        newAlertsCount++;
                    }
                }
            }
        });

        if (newAlertsCount > 0) this.saveToStorage();
        return newAlertsCount;
    }

    async resolveAlert(user: User, id: string, notes: string) {
        const idx = this.alerts.findIndex(a => a.id === id);
        if (idx > -1) {
            this.alerts[idx] = {
                ...this.alerts[idx],
                status: 'RESOLVED',
                resolvedAt: new Date().toISOString(),
                resolvedBy: user.name,
                resolutionNotes: notes
            };
            this.saveToStorage();
            return true;
        }
        return false;
    }

    async getClinics(): Promise<Clinic[]> {
        return this.clinics;
    }

    async createClinic(data: Partial<Clinic>): Promise<Clinic> {
        const id = data.id || `c-${Date.now()}`;
        const newClinic: Clinic = {
            id,
            name: data.name || 'Nova Clínica',
            slug: data.slug || id,
            isActive: true,
            primaryColor: data.primaryColor || '#7c3aed',
            aiConfig: data.aiConfig || { personality: 'ANALITICA', focus: 'FATURAMENTO' },
            scheduleConfig: data.scheduleConfig || { openTime: '08:00', closeTime: '18:00', daysOpen: [1, 2, 3, 4, 5], slotDuration: 30 }
        };
        this.clinics.push(newClinic);
        await this.saveToStorage();
        return newClinic;
    }

    async createUser(data: Partial<User>): Promise<User> {
        const id = data.id || `u-${Date.now()}`;
        const newUser: User = {
            id,
            clinicId: data.clinicId!,
            name: data.name || 'Usuário',
            email: data.email || '',
            role: data.role || Role.PROFESSIONAL,
            password: data.password || '123',
            professionalId: data.professionalId
        };
        this.users.push(newUser);
        await this.saveToStorage();
        return newUser;
    }

    // --- MIPAN-20 (PSICOCOMPORTAMENTAL) ---
    async saveMipanAssessment(user: User, assessment: Partial<MipanAssessment>): Promise<MipanAssessment> {
        const id = assessment.id || `mip-${Date.now()}`;
        const newAssessment: MipanAssessment = {
            id,
            patientId: assessment.patientId!,
            date: assessment.date || new Date().toISOString(),
            answers: assessment.answers || {},
            scores: assessment.scores!,
            icrn: assessment.icrn!,
            classification: assessment.classification!,
            insights: assessment.insights!,
            isDraft: assessment.isDraft || false,
            authorId: user.id
        };

        const existingIdx = this.mipanAssessments.findIndex(a => a.id === id);
        if (existingIdx > -1) {
            this.mipanAssessments[existingIdx] = newAssessment;
        } else {
            this.mipanAssessments.push(newAssessment);
        }

        this.saveToStorage();

        if (!newAssessment.isDraft) {
            this.logPatientEvent(
                newAssessment.patientId,
                'MIPAN_COMPLETED',
                { id, icrn: newAssessment.icrn, classification: newAssessment.classification },
                `Perfil MIPAN-20 concluído: ${newAssessment.classification} (ICRN: ${newAssessment.icrn})`,
                user
            );
        }

        return newAssessment;
    }

    async getMipanAssessments(patientId: string): Promise<MipanAssessment[]> {
        return this.mipanAssessments.filter(a => a.patientId === patientId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async deleteMipanAssessment(id: string) {
        this.mipanAssessments = this.mipanAssessments.filter(a => a.id !== id);
        this.saveToStorage();
    }

    // --- PRESCRIÇÃO CLÍNICA ---
    async getPrescriptions(patientId: string): Promise<Prescription[]> {
        return this.prescriptions
            .filter(rx => rx.patientId === patientId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async savePrescription(user: User, rx: Prescription): Promise<Prescription> {
        const idx = this.prescriptions.findIndex(p => p.id === rx.id);
        if (idx > -1) {
            this.prescriptions[idx] = { ...rx, updatedAt: new Date().toISOString() };
        } else {
            this.prescriptions.push({ ...rx, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }
        this.saveToStorage();
        console.log(`[DB] ✅ Prescrição salva: ${rx.id} (${rx.status})`);
        return rx;
    }

    async deletePrescription(id: string) {
        this.prescriptions = this.prescriptions.filter(rx => rx.id !== id);
        this.saveToStorage();
        console.log(`[DB] 🗑️ Prescrição excluída: ${id}`);
    }

    private calculateAge(birthDate: string) {
        if (!birthDate) return 0;
        const today = new Date(); const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
        return age;
    }
}

export const db = new DatabaseService();
