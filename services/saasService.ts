
// ============================================================
// saasService.ts — ControlClin Backoffice Service
// Gerencia todas as operações administrativas SaaS globais via Firebase
// ============================================================

import { Clinic } from '../types';
import { db as firestore } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './db';

// ─── TIPOS DO BACKOFFICE ────────────────────────────────────

export type PlanType = 'STARTER' | 'ESSENTIAL' | 'PROFESSIONAL' | 'CLINIC' | 'ENTERPRISE' | 'CUSTOM';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';
export type PaymentCycle = 'monthly' | 'quarterly' | 'semester' | 'yearly';
export type CouponType = 'PERCENTAGE' | 'FIXED';

export interface SaaSPlan {
    id: PlanType;
    name: string;
    slug: string;
    description: string;
    maxManagers: number;
    maxProfessionals: number;
    maxPatients: 'unlimited' | number;
    features: string[];
    availableCycles: PaymentCycle[];
    basePrice: number; // Mensal
    discounts: Record<PaymentCycle, number>; // Em percentual (ex: 0.10 para 10%)
    isActive: boolean;
}

export interface SaaSCoupon {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    expiresAt: string;
    maxUses: number;
    currentUses: number;
    maxPerCustomer: number;
    applicablePlans: PlanType[] | 'ALL';
    firstCycleOnly: boolean;
    isActive: boolean;
}

export interface SaaSClinic extends Clinic {
    planId: PlanType;
    status: SubscriptionStatus;
    cycle: PaymentCycle;
    startDate: string;
    nextBillingDate: string;
    responsibleName: string;
    responsibleEmail: string;
    responsiblePhone: string;
    cnpj?: string;
    usedCouponId?: string;
    patientsCount: number;
    professionalsCount: number;
    activeUsersCount: number;
}

export interface SaaSMetrics {
    totalClinics: number;
    activeClinics: number;
    inactiveClinics: number;
    trialClinics: number;
    pastDueClinics: number;
    mrr: number;
    arr: number;
    ltv: number;
    cac: number;
    churnRate: number;
    conversionRate: number;
    plansDistribution: Record<PlanType, number>;
}

export interface SaaSAdmin {
    email: string;
    password: string;
    name: string;
}

// ─── CONFIGURAÇÃO PADRÃO DE PLANOS ─────────────────────────

export const DEFAULT_PLANS: SaaSPlan[] = [
    {
        id: 'STARTER',
        name: 'Starter',
        slug: 'starter',
        description: 'Ideal para profissionais autônomos iniciando.',
        maxManagers: 1,
        maxProfessionals: 0,
        maxPatients: 'unlimited',
        features: ['Agenda', 'Prontuário', 'Relatórios Básicos'],
        availableCycles: ['monthly', 'yearly'],
        basePrice: 97,
        discounts: { monthly: 0, quarterly: 0.1, semester: 0.15, yearly: 0.2 },
        isActive: true
    },
    {
        id: 'ESSENTIAL',
        name: 'Essencial',
        slug: 'essential',
        description: 'Gestor + 1 Profissional. Ideal para parcerias.',
        maxManagers: 1,
        maxProfessionals: 1,
        maxPatients: 'unlimited',
        features: ['Agenda', 'Prontuário', 'WhatsApp Integrado', 'Relatórios'],
        availableCycles: ['monthly', 'quarterly', 'semester', 'yearly'],
        basePrice: 147,
        discounts: { monthly: 0, quarterly: 0.1, semester: 0.2, yearly: 0.3 },
        isActive: true
    },
    {
        id: 'PROFESSIONAL',
        name: 'Profissional',
        slug: 'professional',
        description: 'Foco em produtividade para pequenos consultórios.',
        maxManagers: 1,
        maxProfessionals: 2,
        maxPatients: 'unlimited',
        features: ['Tudo do Essencial', 'IA Nutricional', 'Gestão Financeira'],
        availableCycles: ['monthly', 'quarterly', 'semester', 'yearly'],
        basePrice: 197,
        discounts: { monthly: 0, quarterly: 0.1, semester: 0.2, yearly: 0.3 },
        isActive: true
    },
    {
        id: 'CLINIC',
        name: 'Clínica',
        slug: 'clinic',
        description: 'Multi-profissionais com recursos avançados.',
        maxManagers: 1,
        maxProfessionals: 4,
        maxPatients: 'unlimited',
        features: ['Tudo do Professional', 'Múltiplas Agendas', 'BI Avançado'],
        availableCycles: ['monthly', 'quarterly', 'semester', 'yearly'],
        basePrice: 297,
        discounts: { monthly: 0, quarterly: 0.1, semester: 0.2, yearly: 0.3 },
        isActive: true
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Solução completa para grandes redes.',
        maxManagers: 2,
        maxProfessionals: 8,
        maxPatients: 'unlimited',
        features: ['Multi-clínicas', 'API Externas', 'Suporte VIP'],
        availableCycles: ['monthly', 'quarterly', 'semester', 'yearly'],
        basePrice: 497,
        discounts: { monthly: 0, quarterly: 0.1, semester: 0.2, yearly: 0.3 },
        isActive: true
    }
];

// ─── CREDENCIAL DO SUPER ADMIN SAAS ───────────────────────
const SAAS_ADMIN: SaaSAdmin = {
    email: 'admin@controlclin.com',
    password: 'admin123',
    name: 'Admin ControlClin',
};

// ─── STORAGE KEYS (SESSION ONLY) ──────────────────────────
const SAAS_SESSION_KEY = 'saas_admin_session';

// ─── FIRESTORE PATHS ──────────────────────────────────────
const SAAS_COLLECTION = 'saas_config';
const SAAS_CLINICS_COLLECTION = 'saas_clinics';

// ─── SERVIÇO ──────────────────────────────────────────────

export const saasService = {

    // ── Autenticação (Mantida local p/ sessão simples) ────────
    login(email: string, password: string): boolean {
        if (email.trim().toLowerCase() === SAAS_ADMIN.email && password === SAAS_ADMIN.password) {
            localStorage.setItem(SAAS_SESSION_KEY, JSON.stringify({ email, name: SAAS_ADMIN.name, loginAt: new Date().toISOString() }));
            return true;
        }
        return false;
    },

    logout(): void {
        localStorage.removeItem(SAAS_SESSION_KEY);
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem(SAAS_SESSION_KEY);
    },

    getAdminName(): string {
        try {
            const s = localStorage.getItem(SAAS_SESSION_KEY);
            return s ? JSON.parse(s).name : 'Admin';
        } catch { return 'Admin'; }
    },

    // ── Gestão de Planos (Nuvem) ──────────────────────────────
    async getPlans(): Promise<SaaSPlan[]> {
        try {
            const docRef = doc(firestore, SAAS_COLLECTION, 'plans');
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                return snap.data().items || DEFAULT_PLANS;
            } else {
                // Initial seed
                await setDoc(docRef, { items: DEFAULT_PLANS });
                return DEFAULT_PLANS;
            }
        } catch (err) {
            console.error('[SaaS] Erro ao buscar planos no Firebase:', err);
            return DEFAULT_PLANS;
        }
    },

    async updatePlans(plans: SaaSPlan[]): Promise<void> {
        const docRef = doc(firestore, SAAS_COLLECTION, 'plans');
        await setDoc(docRef, { items: plans });
    },

    // ── Gestão de Cupons (Nuvem) ──────────────────────────────
    async getCoupons(): Promise<SaaSCoupon[]> {
        try {
            const docRef = doc(firestore, SAAS_COLLECTION, 'coupons');
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                return snap.data().items || [];
            } else {
                const defaultCoupons: SaaSCoupon[] = [
                    {
                        id: '1',
                        code: 'LANCAMENTO50',
                        type: 'PERCENTAGE',
                        value: 50,
                        expiresAt: '2026-12-31',
                        maxUses: 100,
                        currentUses: 0,
                        maxPerCustomer: 1,
                        applicablePlans: 'ALL',
                        firstCycleOnly: true,
                        isActive: true
                    }
                ];
                await setDoc(docRef, { items: defaultCoupons });
                return defaultCoupons;
            }
        } catch (err) {
            console.error('[SaaS] Erro ao buscar cupons no Firebase:', err);
            return [];
        }
    },

    async updateCoupons(coupons: SaaSCoupon[]): Promise<void> {
        const docRef = doc(firestore, SAAS_COLLECTION, 'coupons');
        await setDoc(docRef, { items: coupons });
    },

    // ── Gestão de Assinantes (Nuvem) ───────────────────────────
    async getAllClinics(): Promise<SaaSClinic[]> {
        try {
            const colRef = collection(firestore, SAAS_CLINICS_COLLECTION);
            const snap = await getDocs(colRef);
            
            if (snap.empty) {
                // Seed inicial se estiver vazio para demonstração
                const demoId = 'c1';
                const demoClinic: SaaSClinic = {
                    id: demoId,
                    name: 'ControlClin Excellence',
                    slug: 'control',
                    isActive: true,
                    planId: 'PROFESSIONAL',
                    status: 'active',
                    cycle: 'monthly',
                    startDate: '2025-01-01T00:00:00Z',
                    nextBillingDate: '2026-04-01T00:00:00Z',
                    responsibleName: 'Admin Demo',
                    responsibleEmail: 'admin@clinica.com',
                    responsiblePhone: '(11) 99999-9999',
                    patientsCount: 156,
                    professionalsCount: 3,
                    activeUsersCount: 3,
                };
                await this.saveClinicToCloud(demoClinic);
                return [demoClinic];
            }

            return snap.docs.map(d => d.data() as SaaSClinic);
        } catch (err) {
            console.error('[SaaS] Erro ao buscar clínicas no Firebase:', err);
            return [];
        }
    },

    async saveClinicToCloud(clinic: SaaSClinic): Promise<void> {
        const docRef = doc(firestore, SAAS_CLINICS_COLLECTION, clinic.id);
        await setDoc(docRef, clinic);
    },

    async getMetrics(): Promise<SaaSMetrics> {
        const clinics = await this.getAllClinics();
        const active = clinics.filter(c => c.status === 'active');
        const plans = await this.getPlans();

        const mrr = active.reduce((acc, c) => {
            const plan = plans.find(p => p.id === c.planId);
            return acc + (plan?.basePrice || 0);
        }, 0);

        const dist: Record<PlanType, number> = {
            STARTER: 0, ESSENTIAL: 0, PROFESSIONAL: 0, CLINIC: 0, ENTERPRISE: 0, CUSTOM: 0
        };
        clinics.forEach(c => {
            if (dist[c.planId] !== undefined) dist[c.planId]++;
        });

        return {
            totalClinics: clinics.length,
            activeClinics: active.length,
            inactiveClinics: clinics.filter(c => c.status === 'canceled').length,
            trialClinics: clinics.filter(c => c.status === 'trial').length,
            pastDueClinics: clinics.filter(c => c.status === 'past_due').length,
            mrr,
            arr: mrr * 12,
            ltv: mrr * 24 / (clinics.length || 1),
            cac: 450,
            churnRate: 2.4,
            conversionRate: 67,
            plansDistribution: dist
        };
    },

    async createClinic(data: Partial<SaaSClinic>): Promise<SaaSClinic> {
        if (!data.name || !data.responsibleEmail || !data.planId) {
            throw new Error('Dados obrigatórios ausentes: Nome, Email ou Plano.');
        }

        const id = `clinic-${Date.now()}`;
        const startDate = new Date();
        const nextBillingDate = new Date();
        
        // Cálculo do ciclo
        switch (data.cycle) {
            case 'monthly': nextBillingDate.setMonth(startDate.getMonth() + 1); break;
            case 'quarterly': nextBillingDate.setMonth(startDate.getMonth() + 3); break;
            case 'semester': nextBillingDate.setMonth(startDate.getMonth() + 6); break;
            case 'yearly': nextBillingDate.setFullYear(startDate.getFullYear() + 1); break;
            default: nextBillingDate.setMonth(startDate.getMonth() + 1);
        }

        const newClinic: SaaSClinic = {
            id,
            name: data.name,
            slug: data.slug || this.generateSlug(data.name),
            isActive: true,
            status: data.status || 'trial',
            planId: data.planId as PlanType,
            cycle: data.cycle || 'monthly',
            startDate: startDate.toISOString(),
            nextBillingDate: nextBillingDate.toISOString(),
            responsibleName: data.responsibleName || '',
            responsibleEmail: data.responsibleEmail,
            responsiblePhone: data.responsiblePhone || '',
            cnpj: data.cnpj || '',
            patientsCount: 0,
            professionalsCount: 0,
            activeUsersCount: 1,
        };

        // 1. Salva no Registro do SaaS (Nuvem)
        await this.saveClinicToCloud(newClinic);

        // 2. Autoprovisionamento na Base de Dados da Clínica
        try {
            await db.createClinic({
                id: newClinic.id,
                name: newClinic.name,
                slug: newClinic.slug
            });

            await db.createUser({
                clinicId: newClinic.id,
                name: newClinic.responsibleName,
                email: newClinic.responsibleEmail,
                role: 'CLINIC_ADMIN' as any,
                password: '123'
            });
            console.log(`[SaaS] Workspace provisionado na nuvem para ${newClinic.name}`);
        } catch (err) {
            console.error('[SaaS] Erro no autoprovisionamento:', err);
        }

        return newClinic;
    },

    // ── Checkout / Pagamento (Nuvem) ──────────────────────────
    async processPayment(clinicId: string, transactionId: string): Promise<boolean> {
        console.log(`[SaaS] Processando pagamento Cloud para ${clinicId}`);

        const docRef = doc(firestore, SAAS_CLINICS_COLLECTION, clinicId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) throw new Error('Clínica não encontrada');

        const clinic = snap.data() as SaaSClinic;
        
        // Simula checkout sucesso
        const updateData: Partial<SaaSClinic> = {
            status: 'active',
            isActive: true
        };

        const nextDate = new Date();
        if (clinic.cycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (clinic.cycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        updateData.nextBillingDate = nextDate.toISOString();

        await updateDoc(docRef, updateData);
        return true;
    },

    async getClinicStatus(clinicId: string): Promise<SubscriptionStatus> {
        try {
            const docRef = doc(firestore, SAAS_CLINICS_COLLECTION, clinicId);
            const snap = await getDoc(docRef);
            return snap.exists() ? (snap.data() as SaaSClinic).status : 'active';
        } catch {
            return 'active';
        }
    },

    validateEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    validateCNPJ(cnpj: string): boolean {
        const cleaned = cnpj.replace(/\D/g, '');
        return cleaned.length === 14;
    },

    generateSlug(name: string): string {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 30);
    },

    async registerFromLandingPage(data: { name: string, email: string, phone: string, planId: PlanType, cycle: PaymentCycle }): Promise<void> {
        await this.createClinic({
            name: data.name + " (Workspace)",
            responsibleName: data.name,
            responsibleEmail: data.email,
            responsiblePhone: data.phone,
            planId: data.planId,
            cycle: data.cycle,
            status: 'trial'
        });
    },
};
