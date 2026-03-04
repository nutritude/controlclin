
// ============================================================
// saasService.ts — ControlClin Backoffice Service
// Gerencia todas as operações administrativas SaaS globais
// ============================================================

import { db } from './db';
import { Clinic, Role, User } from '../types';

// ─── TIPOS DO BACKOFFICE ────────────────────────────────────

export type PlanType = 'STARTER' | 'ESSENTIAL' | 'PROFESSIONAL' | 'CLINIC' | 'ENTERPRISE';

export interface SaaSClinic extends Clinic {
    plan: PlanType;
    isActive: boolean;
    status: 'active' | 'trial' | 'inactive';
    cycle: 'monthly' | 'quarterly' | 'semester' | 'yearly';
    createdAt: string;
    expiresAt?: string;
    patientsCount?: number;
    professionalsCount?: number;
    appointmentsThisMonth?: number;
    adminEmail?: string;
    adminName?: string;
}

export interface SaaSMetrics {
    totalClinics: number;
    activeClinics: number;
    inactiveClinics: number;
    trialClinics: number;
    starterCount: number;
    essentialCount: number;
    professionalCount: number;
    clinicCount: number;
    enterpriseCount: number;
    totalPatients: number;
    totalProfessionals: number;
    totalAppointments: number;
    mrr: number;
    arr: number;
    churnRate: number;
    conversionRate: number;
}

export interface SaaSAdmin {
    email: string;
    password: string;
    name: string;
}

// ─── PLANOS E PREÇOS ───────────────────────────────────────

export const PLANS: Record<PlanType, { label: string; price: number; color: string; limit: number }> = {
    STARTER: { label: 'Starter', price: 97, color: 'bg-slate-100 text-slate-700 border-slate-200', limit: 200 },
    ESSENTIAL: { label: 'Essencial', price: 147, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', limit: 500 },
    PROFESSIONAL: { label: 'Profissional', price: 197, color: 'bg-blue-100 text-blue-700 border-blue-200', limit: 1000 },
    CLINIC: { label: 'Clínica', price: 297, color: 'bg-purple-100 text-purple-700 border-purple-200', limit: 5000 },
    ENTERPRISE: { label: 'Enterprise', price: 497, color: 'bg-violet-100 text-violet-700 border-violet-200', limit: 99999 },
};

// ─── CREDENCIAL DO SUPER ADMIN SAAS ───────────────────────
// Em produção, mover para variável de ambiente ou Firebase Auth
const SAAS_ADMIN: SaaSAdmin = {
    email: 'admin@controlclin.com',
    password: 'admin123',
    name: 'Admin ControlClin',
};

// ─── STORAGE KEY ──────────────────────────────────────────
const SAAS_SESSION_KEY = 'saas_admin_session';
const SAAS_CLINICS_KEY = 'saas_clinics_registry';

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

    // ── Gestão de Clínicas ───────────────────────────────────
    async getAllClinics(): Promise<SaaSClinic[]> {
        try {
            // Tenta carregar do registro SaaS local
            const stored = localStorage.getItem(SAAS_CLINICS_KEY);
            const registry: SaaSClinic[] = stored ? JSON.parse(stored) : [];

            // Garante que a clínica demo padrão existe no registro
            const mainClinic = await db.getClinic('c1');
            if (mainClinic && !registry.find(c => c.id === 'c1')) {
                const demo: SaaSClinic = {
                    ...mainClinic,
                    plan: 'PROFESSIONAL',
                    isActive: true,
                    status: 'active',
                    cycle: 'monthly',
                    createdAt: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
                    patientsCount: 42,
                    professionalsCount: 3,
                    appointmentsThisMonth: 128,
                    adminEmail: 'admin@clinicademo.com',
                    adminName: 'Administrador Demo',
                };
                registry.unshift(demo);

                // Adiciona mais algumas fakes para o dashboard ficar bonito como no print
                const fake1: SaaSClinic = {
                    ...demo,
                    id: 'fake-1',
                    name: 'ControlClin Excellence',
                    slug: 'excellence',
                    plan: 'PROFESSIONAL',
                    status: 'active',
                    cycle: 'yearly',
                    createdAt: '2025-06-15T10:00:00Z',
                };
                const fake2: SaaSClinic = {
                    ...demo,
                    id: 'fake-2',
                    name: 'Clínica Nutri Vida',
                    slug: 'nutrivida',
                    plan: 'ESSENTIAL',
                    status: 'trial',
                    cycle: 'monthly',
                    createdAt: '2026-02-20T14:30:00Z',
                };
                const fake3: SaaSClinic = {
                    ...demo,
                    id: 'fake-3',
                    name: 'Centro de Nutrição Avançada',
                    slug: 'avancada',
                    plan: 'CLINIC',
                    status: 'active',
                    cycle: 'yearly',
                    createdAt: '2025-12-01T09:00:00Z',
                };

                registry.push(fake1, fake2, fake3);
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
        const trial = clinics.filter(c => c.status === 'trial');
        const mrr = active.reduce((acc, c) => acc + (PLANS[c.plan]?.price || 0), 0);

        return {
            totalClinics: clinics.length,
            activeClinics: active.length,
            inactiveClinics: clinics.filter(c => c.status === 'inactive').length,
            trialClinics: trial.length,
            starterCount: clinics.filter(c => c.plan === 'STARTER').length,
            essentialCount: clinics.filter(c => c.plan === 'ESSENTIAL').length,
            professionalCount: clinics.filter(c => c.plan === 'PROFESSIONAL').length,
            clinicCount: clinics.filter(c => c.plan === 'CLINIC').length,
            enterpriseCount: clinics.filter(c => c.plan === 'ENTERPRISE').length,
            totalPatients: clinics.reduce((acc, c) => acc + (c.patientsCount || 0), 0),
            totalProfessionals: clinics.reduce((acc, c) => acc + (c.professionalsCount || 0), 0),
            totalAppointments: clinics.reduce((acc, c) => acc + (c.appointmentsThisMonth || 0), 0),
            mrr,
            arr: mrr * 12,
            churnRate: 0,
            conversionRate: 67,
        };
    },

    async createClinic(data: {
        name: string;
        slug: string;
        adminName: string;
        adminEmail: string;
        adminPassword: string;
        plan: PlanType;
        cycle?: 'monthly' | 'quarterly' | 'semester' | 'yearly';
    }): Promise<SaaSClinic> {
        const clinics = await this.getAllClinics();

        // Verifica slug único
        if (clinics.find(c => c.slug === data.slug)) {
            throw new Error(`Slug "${data.slug}" já está em uso.`);
        }

        const id = `clinic-${Date.now()}`;
        const newClinic: SaaSClinic = {
            id,
            name: data.name,
            slug: data.slug,
            isActive: true,
            status: 'trial',
            cycle: data.cycle || 'monthly',
            plan: data.plan,
            createdAt: new Date().toISOString(),
            adminName: data.adminName,
            adminEmail: data.adminEmail,
            patientsCount: 0,
            professionalsCount: 0,
            appointmentsThisMonth: 0,
        };

        const updated = [newClinic, ...clinics];
        this._saveRegistry(updated);
        return newClinic;
    },

    async updateClinic(id: string, updates: Partial<SaaSClinic>): Promise<void> {
        const clinics = await this.getAllClinics();
        const idx = clinics.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Clínica não encontrada.');
        clinics[idx] = { ...clinics[idx], ...updates };
        this._saveRegistry(clinics);
    },

    async toggleClinicStatus(id: string): Promise<void> {
        const clinics = await this.getAllClinics();
        const idx = clinics.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Clínica não encontrada.');
        clinics[idx].isActive = !clinics[idx].isActive;
        this._saveRegistry(clinics);
    },

    async deleteClinic(id: string): Promise<void> {
        if (id === 'c1') throw new Error('A clínica demo principal não pode ser removida.');
        const clinics = await this.getAllClinics();
        const updated = clinics.filter(c => c.id !== id);
        this._saveRegistry(updated);
    },

    // ── Utilitários internos ─────────────────────────────────
    _saveRegistry(clinics: SaaSClinic[]): void {
        localStorage.setItem(SAAS_CLINICS_KEY, JSON.stringify(clinics));
    },

    generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .substring(0, 30);
    },
};
