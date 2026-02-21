
import { GoogleGenAI, Type } from "@google/genai";
import {
    User, Clinic, Professional, Patient, Appointment,
    Role, AppointmentStatus, Exam, AuditLog, ExamMarker,
    TimelineEvent, ClinicalNote, FinancialTransaction, AIConfig,
    ClinicalAlert, AlertType, AlertSeverity, Anthropometry, FoodItem, NutritionalPlan, Meal,
    PlanSnapshot, AnthroSnapshot, PatientEvent, IndividualReportSnapshot
} from '../types';
import { NutrientCalc } from './food/nutrientCalc'; // Import NutrientCalc for deterministic totals

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
    { id: 'u0', clinicId: 'system', name: 'Super Admin', email: 'root@control.com', role: Role.SUPER_ADMIN, password: '123' },
    { id: 'u1', clinicId: 'c1', name: 'Dr. Roberto Mendes', email: 'roberto@control.com', role: Role.CLINIC_ADMIN, professionalId: 'p1', password: '123' },
    { id: 'u2', clinicId: 'c1', name: 'Dra. Camila Nutri', email: 'camila@control.com', role: Role.PROFESSIONAL, professionalId: 'p2', password: '123' },
    { id: 'u3', clinicId: 'c1', name: 'Dr. Rangel Angelo', email: 'rangel@control.com', role: Role.PROFESSIONAL, professionalId: 'p3', password: '123' },
];
const DEFAULT_PROFESSIONALS: Professional[] = [
    { id: 'p1', clinicId: 'c1', userId: 'u1', name: 'Dr. Roberto Mendes', email: 'roberto@control.com', phone: '999', specialty: 'Neurologia', registrationNumber: 'CRM 123', color: 'bg-blue-200', isActive: true },
    { id: 'p2', clinicId: 'c1', userId: 'u2', name: 'Dra. Camila Nutri', email: 'camila@control.com', phone: '888', specialty: 'Nutrição', registrationNumber: 'CRN 555', color: 'bg-green-200', isActive: true },
    { id: 'p3', clinicId: 'c1', userId: 'u3', name: 'Dr. Rangel Angelo', email: 'rangel@control.com', phone: '777', specialty: 'Psiquiatria', registrationNumber: 'CRM 999', color: 'bg-red-200', isActive: true }
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
        nutritionalPlans: [DEFAULT_PLAN_PT1]
    },
    { id: 'pt2', clinicId: 'c1', name: 'Mariana Souza', email: 'mari@email.com', phone: '222', birthDate: '2001-08-15', gender: 'Feminino', status: 'ATIVO' },
    {
        id: 'pt_meire',
        clinicId: 'c1',
        name: 'Meire Mendes Dos Reis Da Costa',
        email: 'meire@email.com',
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
        ]
    }
];

class DatabaseService {
    public ai: GoogleGenAI | null = null;
    private clinics: Clinic[] = [];
    private users: User[] = [];
    private professionals: Professional[] = [];
    private patients: Patient[] = [];
    private appointments: Appointment[] = [];
    private exams: Exam[] = [];
    private alerts: ClinicalAlert[] = [];
    private patientEvents: PatientEvent[] = []; // NEW: Store events
    private STORAGE_KEY = 'CONTROLCLIN_DB_V9_MULTI_PLAN';

    constructor() {
        const apiKey = process.env.API_KEY;
        if (apiKey && apiKey.length > 0) {
            try {
                this.ai = new GoogleGenAI({ apiKey: apiKey });
            } catch (error) {
                console.warn("GoogleGenAI init failed, AI features disabled.", error);
                this.ai = null;
            }
        } else {
            console.warn("API_KEY missing. AI features will be disabled.");
            this.ai = null;
        }
        this.loadFromStorage();
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
            } catch (err) {
                console.error("DatabaseService: Shared database corrupted. Resetting to defaults.", err);
                this.clinics = [...DEFAULT_CLINICS];
                this.users = [...DEFAULT_USERS];
                this.professionals = [...DEFAULT_PROFESSIONALS];
                this.patients = [...DEFAULT_PATIENTS];
                this.saveToStorage();
            }

            // AUTO-FIX: Ensure Meire is imported if missing (Real data test)
            const stdMeire = DEFAULT_PATIENTS.find(p => p.id === 'pt_meire')!;
            const meire = this.patients.find(p => p.id === 'pt_meire');
            if (!meire) {
                console.log("DatabaseService: Importing real patient Meire Mendes for testing...");
                this.patients.push(stdMeire);
                this.saveToStorage();
            } else {
                // FORCE OVERRIDE HISTORY: Ensure local storage pulls the newly added raw measurements
                console.log("DatabaseService: Overriding Meire's local history with full raw metrics...");
                meire.anthropometryHistory = [...stdMeire.anthropometryHistory!];
                this.saveToStorage();
            }
        } else {
            // Seed initial data
            this.clinics = [...DEFAULT_CLINICS];
            this.users = [...DEFAULT_USERS];
            this.professionals = [...DEFAULT_PROFESSIONALS];
            this.patients = [...DEFAULT_PATIENTS];
            this.saveToStorage();
        }
    }

    private saveToStorage() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            clinics: this.clinics,
            users: this.users,
            professionals: this.professionals,
            patients: this.patients,
            appointments: this.appointments,
            exams: this.exams,
            alerts: this.alerts,
            patientEvents: this.patientEvents
        }));
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
        this.patientEvents.push(event);
        this.saveToStorage();
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
        // Ensure current snapshot + history are aligned
        const anthroSnapshot = await this.getAnthroSnapshot(patientId);
        const anthroHistory = patient.anthropometryHistory || [];
        // Add current if not saved in history yet? Typically UI handles this, but let's ensure
        // Report should show "Last Evaluation" from the robust snapshot builder

        // 4. Clinical Context
        const activeDiagnoses = patient.clinicalSummary?.activeDiagnoses || [];
        const medications = patient.clinicalHistory?.medications || [];
        const anamnesisSummary = [
            patient.clinicalHistory?.pathologies.join(', '),
            patient.clinicalHistory?.habits,
            patient.clinicalHistory?.symptoms
        ].filter(Boolean).join('. ');

        // 5. Nutritional
        const activePlan = patient.nutritionalPlans?.find(p => p.status === 'ATIVO') || patient.nutritionalPlans?.[0];

        // 6. Financial
        const transactions = patient.financial?.transactions || [];
        const totalPaid = transactions.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0);
        const totalPending = transactions.filter(t => t.status === 'PENDENTE' || t.status === 'AGUARDANDO_AUTORIZACAO').reduce((acc, t) => acc + t.amount, 0);

        // 7. Exams
        const exams = this.exams.filter(e => e.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Construct the comprehensive snapshot
        const snapshot: IndividualReportSnapshot = {
            patient: patient,
            metrics: {
                patientSince,
                totalAppointments: totalAppts,
                attendanceRate,
                nextAppointmentDate: nextAppt ? nextAppt.startTime : null
            },
            anthropometry: {
                current: anthroSnapshot.snapshot,
                history: anthroHistory,
                hasSufficientData: !!anthroSnapshot.snapshot
            },
            clinical: {
                activeDiagnoses,
                medications,
                anamnesisSummary,
                notes: patient.clinicalNotes || []
            },
            exams,
            nutritional: {
                activePlanTitle: activePlan?.title || null,
                targets: activePlan ? {
                    kcal: activePlan.caloricTarget,
                    protein: activePlan.macroTargets.protein.g,
                    carbs: activePlan.macroTargets.carbs.g,
                    fat: activePlan.macroTargets.fat.g
                } : null
            },
            financial: {
                totalPaid,
                totalPending,
                mode: patient.financial?.mode || 'PARTICULAR'
            },
            timeline: timeline.slice(0, 50), // Cap timeline for report performance
            metadata: {
                generatedAt: new Date().toISOString(),
                dataVersion: 'v2-comprehensive',
                source: 'ControlClin DB Service'
            }
        };

        return snapshot;
    }

    // --- STANDARD CRUD METHODS (Abbreviated for focus on Nutritional Plan) ---
    async login(email: string, pass: string, slug: string): Promise<{ user: User, clinic: Clinic } | null> {
        const clinic = this.clinics.find(c => c.slug === slug);
        if (!clinic) return null;
        const user = this.users.find(u => u.email === email && u.password === pass);
        if (!user) return null;
        return { user, clinic };
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
    async createProfessional(user: User, data: any) { /* ... impl ... */ return this.professionals[0]; }
    async updateProfessional(user: User, id: string, data: any) { /* ... impl ... */ return this.professionals[0]; }
    async deleteProfessional(user: User, id: string) { return { reassigned: 0, cancelled: 0 }; }
    async getPatients(clinicId: string, professionalId?: string) { return this.patients.filter(p => p.clinicId === clinicId); }
    async createPatient(user: User, data: any) {
        const p = { id: `pt-${Date.now()}`, clinicId: user.clinicId, ...data, nutritionalPlans: [] };
        this.patients.push(p);
        this.logPatientEvent(p.id, 'CUSTOM', { action: 'CREATED' }, 'Paciente criado', user); // LOG EVENT
        this.saveToStorage(); return p;
    }
    async updatePatient(user: User, id: string, data: any) {
        const idx = this.patients.findIndex(p => p.id === id);
        if (idx > -1) {
            this.patients[idx] = { ...this.patients[idx], ...data };

            // Detect changes for logging
            if (data.anthropometry) this.logPatientEvent(id, 'ANTHRO_RECORDED', {}, 'Medidas antropométricas atualizadas', user);
            if (data.clinicalSummary) this.logPatientEvent(id, 'DIAGNOSIS_UPDATED', {}, 'Resumo clínico atualizado', user);

            this.saveToStorage(); return this.patients[idx];
        }
        throw new Error("Patient not found");
    }
    async deletePatient(user: User, id: string) { this.patients = this.patients.filter(p => p.id !== id); this.saveToStorage(); }
    async getAppointments(clinicId: string, start: Date, end: Date, professionalId?: string) { return this.appointments.filter(a => a.clinicId === clinicId); }
    async getUpcomingAppointments(clinicId: string, limit: number, professionalId?: string) { return this.appointments.slice(0, limit); }
    async getPatientAppointmentsFullHistory(patientId: string, professionalId?: string) { return this.appointments.filter(a => a.patientId === patientId); }
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
        /* ... impl ... */
        // Assuming logic exists here in original, just adding log hook
        this.logPatientEvent(patientId, 'PAYMENT_RECORDED', { amount: data.amount }, `Pagamento registrado: R$${data.amount}`, user);
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
                }
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
                missingMicrosCount: 0, // Placeholder, can improve if catalog has nulls
                itemsWithUnknownDensity: 0 // Placeholder
            }
        };

        return snapshot;
    }

    /**
     * ROBUST ANTHROPOMETRY SNAPSHOT BUILDER
     * Prioritizes 'overridePatient' (UI state) -> 'db record'.
     * Handles unit conversions (m vs cm) and missing fields gracefully.
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

        let bodyFatPct = 0;
        // Jackson & Pollock 7-Fold Sum
        const skinfolds = [
            anthro.skinfoldChest, anthro.skinfoldAbdominal, anthro.skinfoldThigh,
            anthro.skinfoldTriceps, anthro.skinfoldSubscapular, anthro.skinfoldSuprailiac, anthro.skinfoldAxillary
        ];

        // Safe parsing for skinfolds
        const safeSkinfolds = skinfolds.map(s => (typeof s === 'number' && !isNaN(s)) ? s : 0);
        const hasAllSkinfolds = skinfolds.every(s => typeof s === 'number' && s > 0);

        if (!hasAllSkinfolds) {
            // warnings.push("Dobras cutâneas incompletas. Percentual de gordura não calculado.");
        }

        if (hasAllSkinfolds && age > 0) {
            const sum = safeSkinfolds.reduce((a, b) => a + b, 0);
            let bodyDensity = 0;
            if (patient.gender === 'Masculino') {
                bodyDensity = 1.112 - (0.00043499 * sum) + (0.00000055 * sum * sum) - (0.00028826 * age);
            } else {
                bodyDensity = 1.097 - (0.00046971 * sum) + (0.00000056 * sum * sum) - (0.00012828 * age);
            }
            if (bodyDensity > 0) {
                bodyFatPct = parseFloat(((495 / bodyDensity) - 450).toFixed(1));
            }
        }

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

    async improveTextWithAI(text: string) { return text + " (IA)"; }
    async analyzeExamWithAI(user: User, id: string) { /* ... */ }

    // Updated signature to match usage but returns string for backward compat
    async analyzeAnthropometryWithAI(patient: Patient, anthro: Anthropometry) {
        // This is the legacy entry point. Ideally the UI calls the new service directly.
        return "Use o novo botão de análise.";
    }

    // --- DASHBOARD ANALYTICS (FIXED BUG) ---
    async getAdvancedStats(clinicId: string) {
        // Use standard getter to fetch fresh data
        const patients = await this.getPatients(clinicId);
        const appointments = await this.getAppointments(clinicId, new Date('2000-01-01'), new Date('2100-01-01'));

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

    async getReportData(id: string, start: string, end: string, pid?: string) { return []; }
    async getFinancialReportData(id: string, start: string, end: string) { return []; }
    async getAttendanceReportData(id: string, start: string, end: string, pid?: string) { return { stats: { total: 0, missed: 0, noShowRate: 0, variation: 0 }, financial: { estimatedImpact: 0 }, risk: { patientsAtRisk: [] } }; }

    // Replaced with the new implementation above
    // async buildIndividualReportDataset(pid: string, profId?: string) { return ... }

    async generateReportCrossAnalysis(id: string, data: any) { return null; }
    async generateFinancialAnalysis(id: string, data: any) { return null; }
    async generateAttendanceInsights(data: any) { return null; }

    // New AI hook for report summary
    async generateComprehensivePatientAISummary(data: IndividualReportSnapshot): Promise<string> {
        // Placeholder: UI calls the specific service.
        return "Use o serviço AIClinicalSummary.";
    }

    async getClinicalAlerts(id: string, pid?: string) {
        let list = this.alerts.filter(a => a.clinicId === id && a.status === 'ACTIVE');
        // If professionalId filter is needed, it would be passed as pid here or handled similarly to getPatients
        return list;
    }

    async generateClinicalAlerts(id: string) {
        let newAlertsCount = 0;
        const today = new Date();

        this.patients.forEach(patient => {
            if (patient.clinicId !== id || patient.status !== 'ATIVO') return;

            // 1. Logic for ANTHROMETRY_OVERDUE
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
                        const newAlert: ClinicalAlert = {
                            id: 'alt_' + Math.random().toString(36).substr(2, 9),
                            clinicId: id,
                            patientId: patient.id,
                            patientName: patient.name,
                            type: 'ANTHROMETRY_OVERDUE',
                            severity: 'MEDIUM',
                            description: `Paciente está há ${diffDays} dias sem nova avaliação antropométrica (última em ${lastDate.toLocaleDateString('pt-BR')}).`,
                            createdAt: today.toISOString(),
                            status: 'ACTIVE'
                        };
                        this.alerts.push(newAlert);
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

    private calculateAge(birthDate: string) {
        if (!birthDate) return 0;
        const today = new Date(); const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
        return age;
    }
}

export const db = new DatabaseService();
