
// ============================================================
// saasService.ts — ControlClin Backoffice Service
// Gerencia todas as operações administrativas SaaS globais
// ============================================================

import { db } from './db';
import { Clinic } from '../types';

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

// ─── STORAGE KEYS ──────────────────────────────────────────
const SAAS_SESSION_KEY = 'saas_admin_session';
const SAAS_CLINICS_KEY = 'saas_clinics_registry';
const SAAS_PLANS_KEY = 'saas_plans_registry';
const SAAS_COUPONS_KEY = 'saas_coupons_registry';

// ─── SERVIÇO ──────────────────────────────────────────────

export const saasService = {

    // ── Autenticação ────────────────────────────────────────
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

    // ── Gestão de Planos ─────────────────────────────────────
    async getPlans(): Promise<SaaSPlan[]> {
        const stored = localStorage.getItem(SAAS_PLANS_KEY);
        if (!stored) {
            this._savePlans(DEFAULT_PLANS);
            return DEFAULT_PLANS;
        }
        return JSON.parse(stored);
    },

    _savePlans(plans: SaaSPlan[]): void {
        localStorage.setItem(SAAS_PLANS_KEY, JSON.stringify(plans));
    },

    // ── Gestão de Cupons ─────────────────────────────────────
    async getCoupons(): Promise<SaaSCoupon[]> {
        const stored = localStorage.getItem(SAAS_COUPONS_KEY);
        if (!stored) {
            const defaultCoupons: SaaSCoupon[] = [
                {
                    id: '1',
                    code: 'LANCAMENTO50',
                    type: 'PERCENTAGE',
                    value: 50,
                    expiresAt: '2026-03-31',
                    maxUses: 100,
                    currentUses: 12,
                    maxPerCustomer: 1,
                    applicablePlans: 'ALL',
                    firstCycleOnly: true,
                    isActive: true
                }
            ];
            this._saveCoupons(defaultCoupons);
            return defaultCoupons;
        }
        return JSON.parse(stored);
    },

    _saveCoupons(coupons: SaaSCoupon[]): void {
        localStorage.setItem(SAAS_COUPONS_KEY, JSON.stringify(coupons));
    },

    // ── Gestão de Assinantes ───────────────────────────────────
    async getAllClinics(): Promise<SaaSClinic[]> {
        try {
            const stored = localStorage.getItem(SAAS_CLINICS_KEY);
            const registry: SaaSClinic[] = stored ? JSON.parse(stored) : [];

            // Mock de dados se estiver vazio
            if (registry.length === 0) {
                const mainClinic = await db.getClinic('c1');
                const demo: SaaSClinic = {
                    ...(mainClinic || { id: 'c1', name: 'Clínica Demo', slug: 'demo', isActive: true }),
                    planId: 'PROFESSIONAL',
                    status: 'active',
                    cycle: 'monthly',
                    startDate: '2025-01-01T00:00:00Z',
                    nextBillingDate: '2026-04-01T00:00:00Z',
                    responsibleName: 'Administrador Demo',
                    responsibleEmail: 'admin@clinicademo.com',
                    responsiblePhone: '(11) 99999-9999',
                    patientsCount: 156,
                    professionalsCount: 3,
                    activeUsersCount: 3,
                    isActive: true
                };

                const fake1: SaaSClinic = {
                    ...demo,
                    id: 'fake-1',
                    name: 'ControlClin Excellence',
                    slug: 'excellence',
                    planId: 'PROFESSIONAL',
                    status: 'active',
                    cycle: 'yearly',
                    startDate: '2025-06-15T10:00:00Z',
                    nextBillingDate: '2026-06-15T10:00:00Z',
                };
                const fake2: SaaSClinic = {
                    ...demo,
                    id: 'fake-2',
                    name: 'Clínica Nutri Vida',
                    slug: 'nutrivida',
                    planId: 'ESSENTIAL',
                    status: 'trial',
                    cycle: 'monthly',
                    startDate: '2026-02-20T14:30:00Z',
                    nextBillingDate: '2026-03-20T14:30:00Z',
                    patientsCount: 12,
                };

                registry.push(demo, fake1, fake2);
                this._saveRegistry(registry);
            }

            return registry;
        } catch {
            return [];
        }
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
        clinics.forEach(c => dist[c.planId]++);

        return {
            totalClinics: clinics.length,
            activeClinics: active.length,
            inactiveClinics: clinics.filter(c => c.status === 'canceled').length,
            trialClinics: clinics.filter(c => c.status === 'trial').length,
            pastDueClinics: clinics.filter(c => c.status === 'past_due').length,
            mrr,
            arr: mrr * 12,
            ltv: mrr * 24 / (clinics.length || 1), // Simulado
            cac: 450, // Simulado
            churnRate: 2.4,
            conversionRate: 67,
            plansDistribution: dist
        };
    },

    async createClinic(data: Partial<SaaSClinic>): Promise<SaaSClinic> {
        const clinics = await this.getAllClinics();
        const id = `clinic-${Date.now()}`;
        const newClinic = { ...data, id } as SaaSClinic;
        const updated = [newClinic, ...clinics];
        this._saveRegistry(updated);
        return newClinic;
    },

    _saveRegistry(clinics: SaaSClinic[]): void {
        localStorage.setItem(SAAS_CLINICS_KEY, JSON.stringify(clinics));
    },

    generateSlug(name: string): string {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 30);
    },
};
