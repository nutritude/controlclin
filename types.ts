
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  PROFESSIONAL = 'PROFESSIONAL',
  SECRETARY = 'SECRETARY'
}

export enum AppointmentStatus {
  SCHEDULED = 'AGENDADO',
  CONFIRMED = 'CONFIRMADO',
  CANCELED = 'CANCELADO',
  COMPLETED = 'REALIZADO',
  MISSED = 'FALTOU'
}

export interface User {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: Role;
  professionalId?: string;
  password?: string; // Mock password for demo purposes
}

export interface AIConfig {
  personality: 'ANALITICA' | 'EMPATICA' | 'COMERCIAL';
  focus: 'RETENCAO' | 'FATURAMENTO' | 'CAPTACAO';
  customPrompt?: string;
}

export interface ScheduleConfig {
  openTime: string; // "08:00"
  closeTime: string; // "19:00"
  daysOpen: number[]; // 0 (Sun) to 6 (Sat)
  slotDuration?: number; // minutes (default 30)
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;

  // Branding
  logoUrl?: string; // Base64 or URL
  primaryColor?: string;

  // Dados Cadastrais
  cnpj?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;

  // Dados Sociais (Presença Digital)
  website?: string;
  instagram?: string;
  linkedin?: string;

  // Configurações
  aiConfig?: AIConfig;
  scheduleConfig?: ScheduleConfig;
}

export interface Professional {
  id: string;
  clinicId: string;
  userId: string; // Link to the Login User

  // Personal Data
  name: string;
  email: string;
  phone: string; // Celular
  whatsapp?: string; // Whatsapp específico
  cpf?: string;
  address?: string;
  cep?: string;
  city?: string;
  state?: string;

  // Professional Data
  specialty: string;
  registrationNumber: string; // CRM, CRO, etc
  color: string; // Calendar Color

  isActive: boolean;
}

// --- Detalhes do Paciente ---

export interface AnthropometryRecord extends Partial<Omit<Anthropometry, 'weight' | 'height' | 'bmi'>> {
  date: string;
  weight: number;
  height: number;
  bmi: number;
  waistCircumference?: number; // legacy Support
  // Added for historical graphing
  bodyFatPercentage?: number;
  fatMass?: number;
  leanMass?: number;
}

export interface Anthropometry {
  // Medidas Básicas
  weight: number;
  height: number;

  // Dobras Cutâneas (mm)
  skinfoldTriceps?: number;
  skinfoldSubscapular?: number;
  skinfoldBiceps?: number;
  skinfoldChest?: number;
  skinfoldAxillary?: number;
  skinfoldSuprailiac?: number;
  skinfoldAbdominal?: number;
  skinfoldThigh?: number;
  skinfoldCalf?: number;

  // Circunferências (cm)
  circNeck?: number;
  circShoulder?: number;
  circChest?: number;
  circWaist?: number; // Renomeado de waistCircumference
  circAbdomen?: number;
  circHip?: number; // Renomeado de hipCircumference
  circArmRelaxed?: number;
  circArmContracted?: number;
  circForearm?: number;
  circThigh?: number;
  circCalf?: number;

  // Campos Legados (Backwards Compatibility)
  waistCircumference?: number;
  hipCircumference?: number;

  // Bioimpedância (Opcional)
  bioimpedanceFatPercentage?: number;
  muscleMass?: number;

  // Resultados Calculados (Read-only)
  bmi?: number;
  bodyFatPercentage?: number; // %GC
  fatMass?: number; // Massa Gorda (kg)
  leanMass?: number; // Massa Magra (kg)
  waistToHipRatio?: number; // RCQ

  // Análise e Notas
  notes?: string;
  procedureDate?: string; // NOVO: Data de realização do procedimento
  skinfoldProtocol?: skinfoldProtocol; // NOVO: Protocolo de dobras
  anthroAiAnalysis?: string; // Campo para armazenar a análise da IA (JSON stringified)
}

// --- ANTHROPOMETRY SNAPSHOT & ANALYSIS (NEW) ---

export interface AnthroSnapshot {
  patient: {
    name: string;
    gender: string;
    age: number;
  };
  anthro: {
    date: string;
    weightKg: number;
    heightM: number;
    circumferencesCm: Record<string, number | null>;
    skinfoldsMm: Record<string, number | null>;
    bodyComp: {
      bmi: number;
      bodyFatPct: number;
      fatMassKg: number;
      leanMassKg: number;
      whr: number; // Waist-Hip Ratio
    };
  };
  clinical: {
    objective: string;
    activeDiagnoses: string[];
  };
}

export interface AnthroAnalysisResult {
  summary: string;
  keyFindings: string[];
  risks: string[];
  recommendedActions: string[];
  isFallback?: boolean;
}

export interface ClinicalHistory {
  pathologies: string[];
  medications: string[];
  allergies: string[];
  habits: string; // Fumo, álcool, atividade física
  symptoms: string;
}

// Novo Bloco: Resumo Clínico de Topo
export interface PatientClinicalSummary {
  clinicalGoal: string;
  activeDiagnoses: string[];
  updatedAt?: string;
}

// --- NOVO MÓDULO: PLANEJAMENTO NUTRICIONAL ---

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  calories: number; // per 100g/ml
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
  sodium?: number; // mg
  standardPortion: number; // g or ml
  householdMeasure: string; // e.g., "1 colher de sopa"
  unit: 'g' | 'ml';
}

export interface MealItem {
  foodId: string;
  uid?: string; // UID do catálogo científico (se disponível)
  name: string; // Denormalized for display
  quantity: number; // User input amount
  unit: 'g' | 'ml' | 'L' | 'unit'; // Unit selected by user
  calculatedCalories: number;
  calculatedProtein: number;
  calculatedCarbs: number;
  calculatedFat: number;
  snapshot?: Record<string, number>; // Snapshot nutricional (micros e outros campos do FoodRecord)
  substitutes?: MealItem[]; // NOVO: Opções secundárias de substituição
  customName?: string; // NOVO: Nome personalizado para exibição/impressão
}

export interface Meal {
  id: string;
  name: string; // Café, Almoço, etc.
  time?: string; // Horário opcional (ex: 08:00)
  items: MealItem[];
}

export interface NutritionalPlan {
  id: string;
  title?: string; // Nome do plano (ex: "Hipertrofia Fase 1")
  createdAt: string;
  updatedAt?: string; // Added field
  authorId: string;
  status: 'ATIVO' | 'PAUSADO' | 'FINALIZADO';

  // Strategy
  strategyName: string; // e.g. "Low Carb", "Hipertrofia"
  methodology: 'ALIMENTOS' | 'EQUIVALENTES' | 'QUALITATIVA';

  // Calculations
  inputsUsed: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    formula: 'MIFFLIN' | 'HARRIS' | 'FAO_WHO' | 'PENN_STATE' | 'LIPSCHITZ' | 'OMS_SCHOFIELD' | 'HENRY_OXFORD' | 'IOM_GESTANTE' | 'CUNNINGHAM' | 'KATCH_MCARDLE' | 'DIRECT_KCAL_KG' | 'MANUAL';
    activityFactor: number;
    injuryFactor?: number;
    patientProfile?: 'ADULTO_EUTROFICO' | 'ADULTO_SOBREPESO' | 'OBESO' | 'IDOSO' | 'PEDIATRIA' | 'GESTANTE' | 'CRITICO';
    pregnancyTrimestre?: 1 | 2 | 3;
    amputations?: Array<{ limb: string; percent: number }>;
    caloricGoalAdjustment?: number; // % superávit (+) ou déficit (-)
  };

  // Targets
  caloricTarget: number;
  macroTargets: {
    protein: { g: number; pct: number };
    carbs: { g: number; pct: number };
    fat: { g: number; pct: number };
  };

  meals: Meal[];
}

// --- AI ANALYSIS STRUCTURES ---

export interface PlanSnapshot {
  clinic?: {
    name: string;
    logoUrl?: string;
  };
  professional?: {
    name: string;
    registration?: string;
    specialty?: string;
  };
  patient: {
    name: string;
    age: number;
    gender: string;
    diagnoses: string[];
    objective: string;
    activityFactor: number;
    kcalTarget: number;
    macroTargets: { protein: number; carbs: number; fat: number };
    leanMass?: number;
    bodyFatPct?: number;
  };
  plan: {
    id: string;
    title: string;
    meals: Meal[];
  };
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    micros: Record<string, number>;
  };
  dataQuality: {
    missingMicrosCount: number;
    itemsWithUnknownDensity: number;
  };
}

export interface AIAnalysisResult {
  summary: string;
  guidelines: {
    adherence: "LOW" | "MEDIUM" | "HIGH";
    keyFindings: string[];
    risks: string[];
    nextActions: string[];
  };
  mealFeedback: Array<{
    mealName: string;
    notes: string[];
    simpleFixes: string[];
  }>;
  substitutions: Array<{
    foodName: string;
    foodCategory: string;
    replacements: Array<{
      name: string;
      reason: string;
      guideTag: "in_natura" | "minimamente_processado" | "culinario" | "ultraprocessado";
    }>;
  }>;
  disclaimers: string[];
  isFallback?: boolean;
}

// --- NOVO MODELO FINANCEIRO ---
export type PaymentMode = 'PARTICULAR' | 'CONVENIO';
export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'GUIA_CONVENIO';
export type FinancialStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'GLOSADO' | 'AGUARDANDO_AUTORIZACAO';

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string; // ex: "Consulta Rotina", "Procedimento X"
  amount: number; // Valor Final Liquido (Após descontos e juros)
  method: PaymentMethod;
  status: FinancialStatus;

  // Installment Details
  installments?: string; // ex: "1/3" (Visual)

  // Detailed Financial Data (New)
  originalAmount?: number; // Valor de Tabela
  discountPercent?: number; // % Desconto
  interestPercent?: number; // % Juros Totais
  installmentCount?: number; // Número de parcelas (int)

  authorizationCode?: string; // Para convênios
}

export interface FinancialInfo {
  mode: PaymentMode;

  // Dados de Convênio (se mode === 'CONVENIO')
  insuranceName?: string; // ex: Unimed, Bradesco
  insurancePlan?: string; // ex: Top Nacional
  insuranceCardNumber?: string;
  insuranceValidity?: string;

  // Ledger de Transações
  transactions: FinancialTransaction[];
}

// Novos Tipos para Timeline e Prontuário
export type TimelineEventType =
  'PRIMEIRA_CONSULTA' |
  'CONSULTA_ROTINA' |
  'ATUALIZACAO_PLANO' |
  'SOLICITACAO_EXAMES' |
  'AVALIACAO_FISICA' |
  'EDUCACAO_NUTRICIONAL' |
  'OUTRO';

export interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  authorId?: string; // Added for professional attribution
  authorName?: string; // Added for professional attribution
  professionalId?: string; // Added for professional attribution
}

export interface ClinicalNote {
  id: string;
  date: string;
  authorName: string;
  content: string; // Texto rico ou simples
}

// --- PATIENT EVENTS (NEW) ---
export interface PatientEvent {
  id: string;
  clinicId?: string;
  patientId: string;
  type: "PATIENT_UPDATED" | "ANTHRO_RECORDED" | "EXAM_UPLOADED" | "NOTE_ADDED" | "DIAGNOSIS_UPDATED" | "MEDICATION_UPDATED" | "PLAN_CREATED" | "PLAN_UPDATED" | "APPOINTMENT_STATUS" | "PAYMENT_RECORDED" | "CUSTOM" | "BACKFILL_INIT";
  createdAt: string; // ISO
  createdBy?: { userId: string, name: string, role: string };
  payload: any; // Flexible payload
  summary?: string;
}

// --- INDIVIDUAL REPORT SNAPSHOT (NEW) ---
export interface IndividualReportSnapshot {
  patient: Patient;
  metrics: {
    patientSince: string;
    totalAppointments: number;
    attendanceRate: number; // percentage
    nextAppointmentDate: string | null;
  };
  anthropometry: {
    current: AnthroSnapshot | null;
    history: AnthropometryRecord[];
    hasSufficientData: boolean;
  };
  clinical: {
    activeDiagnoses: string[];
    medications: string[];
    anamnesisSummary: string; // Pathologies + Habits + Symptoms
    notes: ClinicalNote[];
  };
  exams: Exam[];
  nutritional: {
    activePlanTitle: string | null;
    targets: { kcal: number; protein: number; carbs: number; fat: number } | null;
  };
  financial: {
    totalPaid: number;
    totalPending: number;
    mode: PaymentMode;
  };
  timeline: PatientEvent[]; // Sorted DESC
  metadata: {
    generatedAt: string;
    dataVersion: string;
    source: string;
  };
}

export interface Patient {
  id: string;
  clinicId: string;
  // Dados Pessoais
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  address?: string;
  cpf?: string;

  // Módulos
  clinicalSummary?: PatientClinicalSummary; // Novo módulo de topo
  clinicalHistory?: ClinicalHistory;
  timelineEvents?: TimelineEvent[]; // Timeline editável
  clinicalNotes?: ClinicalNote[]; // Prontuário com IA

  anthropometry?: Anthropometry;
  anthropometryHistory?: AnthropometryRecord[]; // Histórico para gráficos
  financial?: FinancialInfo;
  nutritionalPlans?: NutritionalPlan[]; // NOVO: Histórico de Planos
  nutritionalPlan?: NutritionalPlan; // Legado (Backwards Compatibility)
  patientEvents?: PatientEvent[];
  lastVisit?: string;
  status: 'ATIVO' | 'INATIVO';
}

export interface Appointment {
  id: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  patientName: string;
  startTime: string;
  endTime: string;
  type: 'AVALIACAO' | 'RETORNO' | 'ROTINA';
  status: AppointmentStatus;
  notes?: string;

  // Financial Fields (New)
  price?: number;
  financialStatus?: FinancialStatus;
  paymentMethod?: PaymentMethod;
}

// --- Exames e IA ---

export interface ExamMarker {
  name: string;
  value: string;
  reference: string;
  interpretation: 'NORMAL' | 'LIMITROFE' | 'ALTERADO';
}

export interface Exam {
  id: string;
  clinicId: string;
  patientId: string;
  date: string;
  name: string;
  status: 'PENDENTE' | 'ANALISADO';
  fileUrl?: string;

  // Clinical Context Fields (New)
  clinicalReason: string; // Mandatory
  appointmentId?: string; // Optional Link
  clinicalHypothesis?: string; // Optional
  requestedByUserId: string; // Auto-filled
  createdAt: string;

  // IA Data
  markers?: ExamMarker[]; // Tabela estruturada
  aiAnalysis?: string; // Texto explicativo completo
}

export interface AuditLog {
  id: string;
  clinicId: string;
  actorId: string;
  action: string;
  details: string;
  timestamp: string;
}

// --- ALERTA DE ATRASO ANTROPOMÉTRICO (NOVO) ---
export type skinfoldProtocol = 'JacksonPollock7' | 'JacksonPollock3' | 'Guedes' | 'DurninWomersley' | 'Faulkner' | 'ISAK';

// --- ALERTAS CLÍNICOS (NOVO) ---
export type AlertType = 'RETURN_OVERDUE' | 'EXAM_ATTENTION' | 'RECURRING_ABSENCE' | 'GOAL_EXPIRED' | 'MISSED_CRITICAL' | 'ANTHROMETRY_OVERDUE';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export interface ClinicalAlert {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  type: AlertType;
  severity: AlertSeverity;
  description: string;
  createdAt: string;
  status: AlertStatus;

  // Resolution info
  resolvedAt?: string;
  resolvedBy?: string; // User Name
  resolutionNotes?: string;
}

// ─── CATÁLOGO CIENTÍFICO DE ALIMENTOS (CSV-based) ────────────────────────────

/**
 * Registro científico de um alimento, originado do MASTER_ALIMENTOS CSV.
 * Colunas obrigatórias: uid, nome_canonico, energia_kcal_100g.
 * Todas as demais colunas nutricionais são opcionais.
 */
export interface FoodRecord {
  uid: string;                        // ID único (UUID v5) do alimento
  nome: string;                       // Nome canônico PT-BR (nome_canonico)
  kcal: number;                       // Energia kcal/100g (energia_kcal_100g)

  // Macronutrientes principais (por 100g)
  proteina_g?: number;                // proteina_g_100g
  carboidratos_g?: number;            // carboidratos_g_100g
  lipidios_g?: number;                // lipidios_g_100g
  fibra_alimentar_g?: number;         // fibra_alimentar_g_100g

  // Micronutrientes relevantes (por 100g)
  sodio_mg?: number;                  // sodio_mg_100g
  calcio_mg?: number;                 // calcio_mg_100g
  ferro_mg?: number;                  // ferro_mg_100g
  potassio_mg?: number;               // potassio_mg_100g
  vitamina_c_mg?: number;             // vitamina_c_mg_100g

  // Metadados de classificação
  grupo?: string;                     // grupo
  subgrupo?: string;                  // subgrupo
  preparo?: string;                   // preparo_detectado
  fonte?: string;                     // __fonte (TACO, INSA, CIQUAL, TBCA)
  prio?: number;                      // __prio (1=TACO/TBCA, alta prioridade para BR)
}

/**
 * Entrada do dicionário de sinônimos.
 * Originado do DICIONARIO_SINONIMOS_ALIMENTOS_UID.csv.
 */
export interface SynonymEntry {
  termo: string;   // Termo normalizado (lowercase, trimmed)
  uid: string;     // UID do alimento correspondente
}

/**
 * Entrada de porção de alimento.
 * Originado do arquivo de porções (PASSO 3).
 */
export interface PortionRecord {
  uid: string;           // UID do alimento correspondente
  label: string;         // Descrição da porção (ex: "1 colher de sopa")
  grams: number;         // Peso em gramas
}

/**
 * Entrada do dicionário de nutrientes padronizados.
 * Originado do DICIONARIO_NUTRIENTES_PADRONIZADOS.csv.
 */
export interface NutrientDef {
  campo: string;   // Nome do campo (ex: "energia_kcal_100g")
  unidade: string; // Unidade (ex: "kcal/100g")
}

/**
 * Resultado de carregamento de um arquivo CSV do catálogo.
 */
export interface CatalogLoadResult {
  success: boolean;
  recordCount: number;
  errors: string[];
  warnings: string[];
}
