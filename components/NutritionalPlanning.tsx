
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Patient, User, NutritionalPlan, Meal, MealItem, AIAnalysisResult } from '../types';
import { db } from '../services/db';
import { Icons } from '../constants';
import { FoodService, FoodItemCanonical } from '../services/food/foodCatalog';
import { CatalogSync } from '../services/food/catalogSync';
import { NutrientCalc, DailyNutrientTotals } from '../services/food/nutrientCalc';
import { SubstitutionService, SubstitutionSuggestion } from '../services/food/substitutions';
import { ShoppingListService, ShoppingItem } from '../services/food/shoppingList';
import { AIPlanAnalysisService } from '../services/aiPlanAnalysis';
import { AIAdherenceService, AdherenceAnalysis } from '../services/ai/aiAdherenceService';
import { EnergyExpenditureService, AMPUTATION_MEMBERS } from '../services/nutrition/energyExpenditure';
import AddFoodModal from './AddFoodModal';
import EditFoodModal from './EditFoodModal';

// --- HELPERS GLOBAIS ---



interface NutritionalPlanningProps {
    patient: Patient;
    user: User;
    isManagerMode: boolean;
}

const DEFAULT_MEALS_TEMPLATE = [
    { name: 'Café da Manhã', items: [] },
    { name: 'Lanche da Manhã', items: [] },
    { name: 'Almoço', items: [] },
    { name: 'Lanche da Tarde', items: [] },
    { name: 'Jantar', items: [] },
    { name: 'Ceia', items: [] },
];

const PROFILE_CONFIGS = {
    ADULTO_EUTROFICO: { label: 'Adulto Eutrófico / Atleta', formulas: ['HENRY_OXFORD', 'HARRIS', 'MIFFLIN', 'CUNNINGHAM', 'KATCH_MCARDLE', 'DIRECT_KCAL_KG'] },
    ADULTO_SOBREPESO: { label: 'Adulto Sobrepeso', formulas: ['HENRY_OXFORD', 'HARRIS', 'MIFFLIN', 'DIRECT_KCAL_KG'] },
    OBESO: { label: 'Obeso', formulas: ['HARRIS_OBESO', 'MIFFLIN', 'PENN_STATE', 'DIRECT_KCAL_KG'] },
    IDOSO: { label: 'Idoso', formulas: ['LIPSCHITZ', 'HARRIS'] },
    PEDIATRIA: { label: 'Pediatria/Adolescente', formulas: ['SCHOFIELD', 'FAO_WHO'] },
    GESTANTE: { label: 'Gestante', formulas: ['IOM_GESTANTE', 'HARRIS'] },
    CRITICO: { label: 'Crítico/Acamado', formulas: ['PENN_STATE', 'HARRIS'] }
};

const INJURY_FACTORS = [
    { label: 'Paciente Hígido (1.0)', value: 1.0 },
    { label: 'Cirurgia Eletiva (1.1)', value: 1.1 },
    { label: 'Trauma Leve (1.2)', value: 1.2 },
    { label: 'Infecção Moderada (1.3)', value: 1.3 },
    { label: 'Trauma Grave (1.5)', value: 1.5 },
    { label: 'Queimadura Grave (2.0)', value: 2.0 }
];

const ACTIVITY_FACTORS_DETAILED = [
    { label: 'Sedentário / Acamado (1.2)', value: 1.2 },
    { label: 'Atividade Leve (1.375)', value: 1.375 },
    { label: 'Atividade Moderada (1.55)', value: 1.55 },
    { label: 'Atividade Intensa (1.725)', value: 1.725 },
    { label: 'Atleta / Extremo (1.9)', value: 1.9 }
];

interface InputRowProps {
    label: string;
    value: number;
    unit: string;
    disabled: boolean;
    onChange: (val: number) => void;
}

const InputRow: React.FC<InputRowProps> = ({ label, value, unit, disabled, onChange }) => (
    <div>
        <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
        <div className="flex items-center gap-2 mt-1">
            <input
                type="number"
                value={value || ''}
                disabled={disabled}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-500 bg-white border-gray-300 text-gray-900"
            />
            <span className="text-xs text-gray-500">{unit}</span>
        </div>
    </div>
);

const NutritionalPlanning: React.FC<NutritionalPlanningProps> = ({ patient, user, isManagerMode }) => {
    // --- STATE ---
    const [plansList, setPlansList] = useState<NutritionalPlan[]>([]);
    const [activePlan, setActivePlan] = useState<NutritionalPlan | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [planTitle, setPlanTitle] = useState('');

    // TDEE State
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualWeight, setManualWeight] = useState<number>(0);
    const [manualHeight, setManualHeight] = useState<number>(0);
    const [manualReason, setManualReason] = useState('');

    const [calcFormula, setCalcFormula] = useState<string>('MIFFLIN');
    const [calcActivityFactor, setCalcActivityFactor] = useState(1.55);
    const [calcInjuryFactor, setCalcInjuryFactor] = useState(1.0);
    const [patientProfile, setPatientProfile] = useState<string>('ADULTO_EUTROFICO');
    const [pregnancyTrimestre, setPregnancyTrimestre] = useState<1 | 2 | 3>(1);
    const [amputations, setAmputations] = useState<Array<{ limb: string; percent: number }>>([]);
    const [caloricGoalAdjustment, setCaloricGoalAdjustment] = useState(0);
    const [isAmputeeModuleOpen, setIsAmputeeModuleOpen] = useState(false);
    const [showCalcMemory, setShowCalcMemory] = useState(false);

    // Plan Config State
    const [isDrafting, setIsDrafting] = useState(false);
    const [planStrategy, setPlanStrategy] = useState('Dieta Balanceada');
    const [planMethodology, setPlanMethodology] = useState<'ALIMENTOS' | 'EQUIVALENTES' | 'QUALITATIVA'>('ALIMENTOS');

    // Macro Targets
    const [targetKcal, setTargetKcal] = useState<number>(0);
    const [proteinGrams, setProteinGrams] = useState<number>(0);
    const [fatGrams, setFatGrams] = useState<number>(0);

    // Meal Management State    // Meal State
    const [meals, setMeals] = useState<Meal[]>([]);
    const mealsRef = useRef<Meal[]>([]);

    const patientAge = useMemo(() => {
        if (!patient.birthDate) return 0;
        const birth = new Date(patient.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }, [patient.birthDate]);

    const lastAnthro = patient.anthropometry;
    const patientWeight = lastAnthro?.weight || 0;
    const patientHeight = lastAnthro?.height ? lastAnthro.height * 100 : 0;
    const hasAnthroData = patientWeight > 0 && patientHeight > 0;

    // --- CALCULATIONS ---
    const calculationInputs = useMemo(() => ({
        weight: isManualMode ? manualWeight : patientWeight,
        height: isManualMode ? manualHeight : patientHeight,
        age: patientAge,
        gender: patient.gender,
        leanMass: lastAnthro?.leanMass
    }), [isManualMode, manualWeight, patientWeight, manualHeight, patientHeight, patientAge, patient.gender, lastAnthro?.leanMass]);

    // Keep ref sync with state to avoid stale closures in save handlers
    useEffect(() => {
        mealsRef.current = meals;
    }, [meals]);

    // --- MODAL STATES ---
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [currentMealId, setCurrentMealId] = useState<string | null>(null);
    const [replaceMode, setReplaceMode] = useState<{ itemIndex: number, originalFoodId?: string } | null>(null);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    // Meal Editing Modal
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [mealForm, setMealForm] = useState({ id: '', name: '', time: '' });

    // Item Editing Modal (NEW)
    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MealItem | null>(null);

    // Micros & Shopping List Modals
    const [showMicrosModal, setShowMicrosModal] = useState(false);
    const [showShoppingListModal, setShowShoppingListModal] = useState(false);
    const [showSubstitutesDrawer, setShowSubstitutesDrawer] = useState<{ mealId: string, itemIdx: number, foodId: string } | null>(null);
    const [substituteCandidates, setSubstituteCandidates] = useState<SubstitutionSuggestion[]>([]);
    const [subTab, setSubTab] = useState<'SUGGESTIONS' | 'SEARCH'>('SUGGESTIONS');
    const [subQuery, setSubQuery] = useState('');
    const [subSearchResults, setSubSearchResults] = useState<FoodItemCanonical[]>([]);
    const [subConfigItem, setSubConfigItem] = useState<FoodItemCanonical | null>(null);
    const [subConfigPortionIdx, setSubConfigPortionIdx] = useState(0);
    const [subConfigQuantity, setSubConfigQuantity] = useState(1);
    const [subConfigCustomName, setSubConfigCustomName] = useState('');
    const [subConfigManualWeight, setSubConfigManualWeight] = useState('');

    // Item management states removed (moved to modals)

    // AI & PDF
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [adherenceAnalysis, setAdherenceAnalysis] = useState<AdherenceAnalysis | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);
    const [snapshotForPdf, setSnapshotForPdf] = useState<any>(null);

    // --- SYNC CHECK ---
    useEffect(() => {
        CatalogSync.checkAndSync();
    }, []);

    // --- INITIALIZATION ---
    useEffect(() => {
        fetchPlans();
    }, [patient.id]);

    const fetchPlans = async () => {
        try {
            const list = await db.listNutritionalPlans(patient.id);
            setPlansList(list);

            if (list.length > 0) {
                // Prefer Active Plan, else first one
                const active = list.find(p => p.status === 'ATIVO') || list[0];
                loadPlanIntoState(active);
            } else {
                // No plans exist, create draft
                initNewDraft();
            }
        } catch (err) {
            console.error("Failed to fetch plans", err);
        }
    };

    const loadPlanIntoState = (plan: NutritionalPlan) => {
        setActivePlan(plan);
        setCurrentPlanId(plan.id);
        setPlanTitle(plan.title || `Plano ${new Date(plan.createdAt).toLocaleDateString()}`);
        setIsDrafting(false); // It's a saved plan

        // Load Configuration
        setPlanStrategy(plan.strategyName || '');
        setPlanMethodology(plan.methodology || 'ALIMENTOS');
        setTargetKcal(plan.caloricTarget || 0);
        if (plan.macroTargets) {
            setProteinGrams(plan.macroTargets.protein.g);
            setFatGrams(plan.macroTargets.fat.g);
        }
        if (plan.inputsUsed) {
            setCalcFormula(plan.inputsUsed.formula as any);
            setCalcActivityFactor(plan.inputsUsed.activityFactor);
            setCalcInjuryFactor(plan.inputsUsed.injuryFactor || 1.0);
            setPatientProfile(plan.inputsUsed.patientProfile || 'ADULTO_EUTROFICO');
            setPregnancyTrimestre((plan.inputsUsed as any).pregnancyTrimestre || 1);
            setAmputations(plan.inputsUsed.amputations || []);
            setCaloricGoalAdjustment(plan.inputsUsed.caloricGoalAdjustment || 0);

            // Restore manual weight and height gracefully
            const savedWeight = plan.inputsUsed.weight;
            const savedHeight = plan.inputsUsed.height;
            if (savedWeight) setManualWeight(savedWeight);
            if (savedHeight) setManualHeight(savedHeight);

            // Auto-detect if manual mode should be enabled based on divergence from patient anthropometry
            const lastAnthro = patient.anthropometry;
            const ptWeight = lastAnthro?.weight || 0;
            const ptHeight = lastAnthro?.height ? lastAnthro.height * 100 : 0;

            if (savedWeight && savedHeight && (savedWeight !== ptWeight || savedHeight !== ptHeight)) {
                setIsManualMode(true);
            } else {
                setIsManualMode(false);
            }
        }

        // Load Meals (ensure dynamic)
        if (plan.meals && plan.meals.length > 0) {
            setMeals(plan.meals);
        } else {
            // Fallback if saved plan has no meals (rare)
            initDefaultMeals();
        }
    };

    const initDefaultMeals = () => {
        const initialMeals: Meal[] = DEFAULT_MEALS_TEMPLATE.map((tmpl, idx) => ({
            id: `meal-${Date.now()}-${idx}`,
            name: tmpl.name,
            time: '',
            items: []
        }));
        setMeals(initialMeals);
    };

    const initNewDraft = () => {
        setCurrentPlanId(null); // Indicates Draft
        setActivePlan(null);
        setIsDrafting(true);
        setPlanTitle(`Novo Plano - ${new Date().toLocaleDateString()}`);
        setPlanStrategy('Dieta Balanceada');
        setTargetKcal(0);
        initDefaultMeals();
        // Reset Calc inputs to patient defaults if needed, or keep last used
    };


    const calculatedResults = useMemo(() => {
        const { weight, height, age, gender } = calculationInputs;
        if (!weight || !height || !age) return { bmr: 0, tdee: 0, isValid: false, calculationMemory: '', weightAdjusted: weight, safetyRange: { min: 0, max: 0 } };

        const result = EnergyExpenditureService.calculate({
            weight,
            height,
            age,
            gender: gender as any,
            formula: calcFormula,
            activityFactor: calcActivityFactor,
            injuryFactor: calcInjuryFactor,
            amputations,
            caloricGoalAdjustment,
            patientProfile,
            pregnancyTrimestre,
            leanMass: calculationInputs.leanMass
        });

        return {
            bmr: result.tmb,
            tdee: result.get,
            kcalTarget: result.kcalTarget,
            isValid: true,
            calculationMemory: result.calculationMemory,
            weightAdjusted: result.weightAdjusted,
            safetyRange: result.safetyRange
        };
    }, [calculationInputs, calcFormula, calcActivityFactor, calcInjuryFactor, amputations, caloricGoalAdjustment]);

    // --- AVOID STALE CLOSURES HACK ---
    // Because handleSavePlan is a callback that might run without re-binding,
    // it captures the INITIAL render state of all these variables.
    // We use a ref to always have the latest state on hand.
    const stateRef = useRef({
        meals,
        planTitle,
        planStrategy,
        planMethodology,
        calculationInputs,
        calcFormula,
        calcActivityFactor,
        calcInjuryFactor,
        patientProfile,
        pregnancyTrimestre,
        amputations,
        caloricGoalAdjustment,
        targetKcal,
        macroResults: { protein: { g: 0, kcal: 0, pct: 0 }, fat: { g: 0, kcal: 0, pct: 0 }, carbs: { g: 0, kcal: 0, pct: 0 } } // Updated via effect
    });

    // Sync ref continually
    useEffect(() => {
        stateRef.current = {
            meals,
            planTitle,
            planStrategy,
            planMethodology,
            calculationInputs,
            calcFormula,
            calcActivityFactor,
            calcInjuryFactor,
            patientProfile,
            pregnancyTrimestre,
            amputations,
            caloricGoalAdjustment,
            targetKcal,
            macroResults: stateRef.current.macroResults // Updated separately
        };
    }, [
        meals, planTitle, planStrategy, planMethodology, calculationInputs,
        calcFormula, calcActivityFactor, calcInjuryFactor, patientProfile,
        pregnancyTrimestre, amputations, caloricGoalAdjustment, targetKcal
    ]);

    // Auto-set TDEE for Drafts if calc valid
    useEffect(() => {
        if (isDrafting && !currentPlanId && calculatedResults.isValid && targetKcal === 0) {
            setTargetKcal(calculatedResults.kcalTarget || calculatedResults.tdee);
            // Auto set macro distro suggestion
            setProteinGrams(Math.round(calculationInputs.weight * 2));
            setFatGrams(Math.round(calculationInputs.weight * 1));
        }
    }, [calculatedResults.tdee, isDrafting, currentPlanId]);

    // --- REAL-TIME TOTALS (MEMOIZED) ---
    const dailyTotals: DailyNutrientTotals = useMemo(() => {
        return NutrientCalc.calculateDailyTotals(meals);
    }, [meals]);

    const macroResults = useMemo(() => {
        const pCals = proteinGrams * 4;
        const fCals = fatGrams * 9;
        const remainingCals = targetKcal - (pCals + fCals);
        const carbsGrams = Math.max(0, Math.round(remainingCals / 4));
        const results = {
            protein: { g: proteinGrams, kcal: pCals, pct: targetKcal > 0 ? Math.round((pCals / targetKcal) * 100) : 0 },
            fat: { g: fatGrams, kcal: fCals, pct: targetKcal > 0 ? Math.round((fCals / targetKcal) * 100) : 0 },
            carbs: { g: carbsGrams, kcal: carbsGrams * 4, pct: targetKcal > 0 ? Math.round(((carbsGrams * 4) / targetKcal) * 100) : 0 }
        };
        stateRef.current.macroResults = results; // Keep ref updated manually
        return results;
    }, [targetKcal, proteinGrams, fatGrams]);

    // --- PLAN ACTIONS ---
    const handleSavePlan = async () => {
        if (!user.professionalId && user.role === 'PROFESSIONAL') {
            alert("Erro: Profissional não identificado.");
            return;
        }

        const planIdToSave = currentPlanId || `plan-${Date.now()}`;

        const state = stateRef.current; // GUARANTEED FRESH STATE

        const planToSave: NutritionalPlan = {
            id: planIdToSave,
            createdAt: activePlan?.createdAt || new Date().toISOString(),
            authorId: user.professionalId || user.id,
            status: 'ATIVO',
            title: state.planTitle,
            strategyName: state.planStrategy,
            methodology: state.planMethodology,
            inputsUsed: {
                weight: state.calculationInputs.weight,
                height: state.calculationInputs.height,
                age: state.calculationInputs.age,
                gender: state.calculationInputs.gender,
                formula: state.calcFormula as any,
                activityFactor: state.calcActivityFactor,
                injuryFactor: state.calcInjuryFactor,
                patientProfile: state.patientProfile as any,
                pregnancyTrimestre: state.patientProfile === 'GESTANTE' ? state.pregnancyTrimestre : undefined,
                amputations: state.amputations,
                caloricGoalAdjustment: state.caloricGoalAdjustment
            },
            caloricTarget: state.targetKcal,
            macroTargets: {
                protein: state.macroResults.protein,
                carbs: state.macroResults.carbs,
                fat: state.macroResults.fat
            },
            meals: state.meals
        };

        try {
            const saved = await db.upsertNutritionalPlan(user, patient.id, planToSave);
            // Refresh list and update current selection
            const updatedList = await db.listNutritionalPlans(patient.id);
            setPlansList(updatedList);
            loadPlanIntoState(saved);

            // Force Firebase sync after save
            setSyncStatus(null);
            setIsSyncing(true);
            const syncResult = await db.forceSync();
            setSyncStatus(syncResult.success ? '✅ Salvo!' : '⚠️ Erro na Nuvem');
            setIsSyncing(false);
            setTimeout(() => setSyncStatus(null), 3000);

            if (syncResult.success) {
                alert("Salvo!");
            } else {
                alert(`ATENÇÃO: Os dados foram salvos APENAS no seu computador.\n\nMotivo da falha na nuvem:\n${syncResult.message}`);
            }
        } catch (err) {
            alert("Erro ao salvar plano. Nenhuma outra área foi afetada. " + err);
        }
    };

    const handlePlanSelection = (planId: string) => {
        const selected = plansList.find(p => p.id === planId);
        if (selected) loadPlanIntoState(selected);
    };

    // --- MEAL ACTIONS (DYNAMIC) ---
    const handleAddMeal = () => {
        setMealForm({ id: '', name: '', time: '' });
        setIsMealModalOpen(true);
    };

    const handleEditMeal = (meal: Meal) => {
        setMealForm({ id: meal.id, name: meal.name, time: meal.time || '' });
        setIsMealModalOpen(true);
    };

    const handleSaveMealConfig = () => {
        if (!mealForm.name.trim()) return;

        if (mealForm.id) {
            // Edit existing
            setMeals(prev => prev.map(m =>
                m.id === mealForm.id ? { ...m, name: mealForm.name, time: mealForm.time } : m
            ));
        } else {
            // Create new (Append to end)
            const newMeal: Meal = {
                id: `meal-${Date.now()}`,
                name: mealForm.name,
                time: mealForm.time,
                items: []
            };
            setMeals(prev => [...prev, newMeal]);
        }
        setIsMealModalOpen(false);
    };

    const handleDeleteMeal = (mealId: string) => {
        if (confirm('Tem certeza que deseja remover esta refeição e todos os seus itens?')) {
            setMeals(prev => prev.filter(m => m.id !== mealId));
        }
    };

    const handleMoveMeal = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === meals.length - 1) return;

        const newMeals = [...meals];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newMeals[targetIndex];
        newMeals[targetIndex] = newMeals[index];
        newMeals[index] = temp;
        setMeals(newMeals);
    };

    const handleDuplicateMeal = (meal: Meal) => {
        const duplicatedMeal: Meal = {
            ...meal,
            id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: `${meal.name} (Cópia)`,
            items: meal.items.map(item => ({ ...item }))
        };
        setMeals(prev => [...prev, duplicatedMeal]);
    };

    // --- ITEM MANAGEMENT (REFACTORED) ---
    const openAddItemModal = (mealId: string, substitutionMode = false, itemIndex = -1, originalFoodId?: string) => {
        setCurrentMealId(mealId);
        setEditingItemIndex(itemIndex >= 0 ? itemIndex : null);

        if (itemIndex >= 0) {
            const meal = meals.find(m => m.id === mealId);
            const item = meal?.items[itemIndex];
            if (item) {
                setEditingItem(item);
                setIsEditItemModalOpen(true);
            }
        } else {
            setEditingItem(null);
            setIsAddItemModalOpen(true);
        }
    };

    const handleConfirmAddItem = (newItem: MealItem) => {
        if (!currentMealId) return;

        setMeals(prevMeals => prevMeals.map(meal => {
            if (meal.id === currentMealId) {
                if (editingItemIndex !== null) {
                    const newItems = [...meal.items];
                    newItems[editingItemIndex] = newItem;
                    return { ...meal, items: newItems };
                } else {
                    return { ...meal, items: [...meal.items, newItem] };
                }
            }
            return meal;
        }));
        setIsAddItemModalOpen(false);
        setIsEditItemModalOpen(false);
    };


    const handleRemoveItem = (mealId: string, itemIndex: number) => {
        setMeals(prevMeals => prevMeals.map(meal => {
            if (meal.id === mealId) {
                const newItems = [...meal.items];
                newItems.splice(itemIndex, 1);
                return { ...meal, items: newItems };
            }
            return meal;
        }));
    };

    const handleOpenSubstitutes = (mealId: string, itemIdx: number, foodId: string) => {
        // Encontrar o item original para pegar o alvo calórico
        const meal = meals.find(m => m.id === mealId);
        const originalItem = meal?.items[itemIdx];
        const referenceKcal = originalItem?.calculatedCalories || 0;

        const suggestions = SubstitutionService.findSubstitutes(foodId, referenceKcal);
        setSubstituteCandidates(suggestions);
        setSubTab('SUGGESTIONS');
        setSubQuery('');
        setSubSearchResults([]);
        setShowSubstitutesDrawer({ mealId, itemIdx, foodId });
    };

    // Free Search in Substitution Drawer
    useEffect(() => {
        if (subTab === 'SEARCH' && subQuery.length >= 2) {
            const results = FoodService.search(subQuery);
            setSubSearchResults(results);
        } else {
            setSubSearchResults([]);
        }
    }, [subQuery, subTab]);

    const handlePreSelectSubstitution = (cand: FoodItemCanonical, suggestion?: SubstitutionSuggestion) => {
        setSubConfigItem(cand);
        if (suggestion) {
            setSubConfigPortionIdx(suggestion.suggestedPortionIdx);
            setSubConfigQuantity(suggestion.suggestedQuantity);
            setSubConfigManualWeight(suggestion.isManualWeight ? suggestion.suggestedWeightGrams.toString() : '');
        } else {
            setSubConfigPortionIdx(0);
            setSubConfigQuantity(1);
            setSubConfigManualWeight('');
        }
        setSubConfigCustomName(cand.namePt);
    };

    const confirmSubstitution = () => {
        if (!showSubstitutesDrawer || !subConfigItem) return;

        let portionLabel = '';
        let kcal = 0, protein = 0, carbs = 0, fat = 0, snapshot = {};

        if (subConfigPortionIdx === -1) {
            // Cálculo Manual
            const weight = parseFloat(subConfigManualWeight) || 0;
            const totals = FoodService.calculateTotals(subConfigItem, 0, (weight * subConfigQuantity) / subConfigItem.portions[0].grams);
            // Na verdade FoodService.calculateTotals não aceita cálculo por gramas direto, melhor fazer aqui:
            const ratio = (weight * subConfigQuantity) / 100;
            const nut = subConfigItem.nutrientsPer100g;
            kcal = Math.round(nut.kcal * ratio);
            protein = parseFloat((nut.protein_g * ratio).toFixed(1));
            carbs = parseFloat((nut.carb_g * ratio).toFixed(1));
            fat = parseFloat((nut.fat_g * ratio).toFixed(1));
            snapshot = {
                fiber: (nut.fiber_g || 0) * ratio,
                sodium: (nut.sodium_mg || 0) * ratio,
                calcium: (nut.calcium_mg || 0) * ratio,
                iron: (nut.iron_mg || 0) * ratio,
                potassium: (nut.potassium_mg || 0) * ratio,
                vitaminC: (nut.vitaminC_mg || 0) * ratio
            };
            // Determinar unidade mL ou g
            const liquidos = ['leite', 'suco', 'bebida', 'água', 'chá', 'café', 'vitamina', 'iogurte líquido', 'caldo', 'sopa', 'oleo', 'azeite'];
            const CEREALS = ['cereais', 'pães', 'paes', 'massas', 'arroz', 'farinha', 'biscoito', 'milho', 'aveia', 'granola', 'torrada', 'tapioca'];
            const TUBERS = ['tubérculos', 'batata', 'mandioca', 'cará', 'inhame', 'mandioquinha'];
            const FRUITS = ['frutas', 'fruta', 'suco de fruta', 'polpa'];
            const isLiquid = liquidos.some(l => subConfigItem.namePt.toLowerCase().includes(l));
            portionLabel = `${weight}${isLiquid ? 'mL' : 'g'}`;
        } else {
            const portion = subConfigItem.portions[subConfigPortionIdx];
            const totals = FoodService.calculateTotals(subConfigItem, subConfigPortionIdx, subConfigQuantity);
            portionLabel = portion.label;
            kcal = totals.kcal;
            protein = totals.protein;
            carbs = totals.carbs;
            fat = totals.fat;
            snapshot = {
                fiber: totals.fiber,
                sodium: totals.sodium,
                calcium: totals.calcium || 0,
                iron: totals.iron || 0,
                potassium: totals.potassium || 0,
                vitaminC: totals.vitaminC || 0
            };
        }

        const subItem: MealItem = {
            foodId: subConfigItem.id,
            name: subConfigItem.namePt,
            quantity: subConfigQuantity,
            unit: portionLabel as any,
            calculatedCalories: kcal,
            calculatedProtein: protein,
            calculatedCarbs: carbs,
            calculatedFat: fat,
            snapshot: snapshot as any,
            customName: subConfigCustomName
        };

        setMeals(prev => prev.map(m => {
            if (m.id === showSubstitutesDrawer.mealId) {
                const newItems = [...m.items];
                const originalItem = newItems[showSubstitutesDrawer.itemIdx];
                const currentSubs = originalItem.substitutes || [];

                // Se já existe, vamos substituir (para permitir atualização de porção)
                const updatedSubs = currentSubs.filter(s => s.foodId !== subItem.foodId);

                newItems[showSubstitutesDrawer.itemIdx] = {
                    ...originalItem,
                    substitutes: [...updatedSubs, subItem]
                };
                return { ...m, items: newItems };
            }
            return m;
        }));
        setShowSubstitutesDrawer(null);
        setSubConfigItem(null);
        setSubConfigCustomName('');
        setSubConfigManualWeight('');
    };

    const handleRemoveSubstitute = (mealId: string, itemIdx: number, subIdx: number) => {
        setMeals(prev => prev.map(m => {
            if (m.id === mealId) {
                const newItems = [...m.items];
                const originalItem = newItems[itemIdx];
                const newSubs = [...(originalItem.substitutes || [])];
                newSubs.splice(subIdx, 1);
                newItems[itemIdx] = { ...originalItem, substitutes: newSubs };
                return { ...m, items: newItems };
            }
            return m;
        }));
    };

    // --- AI & PDF ---
    const handleAnalyzeWithAI = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!currentPlanId) { alert("Salve o plano antes."); return; }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            // 1. Build Snapshot Deterministically
            const snapshot = await db.buildNutritionPlanSnapshot(user, patient.id);
            if (snapshot) {
                // 2. Call New AI Service
                const result = await AIPlanAnalysisService.analyzePlan(snapshot);
                setAnalysisResult(result);
            } else {
                alert("Erro ao gerar snapshot dos dados.");
            }
        } catch (err) { alert("Erro na IA: " + err); }
        finally { setIsAnalyzing(false); }
    };

    const handleGenerateAdherenceTips = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsAnalyzing(true);
        try {
            const snapshot = await db.buildNutritionPlanSnapshot(user, patient.id);
            if (snapshot) {
                const result = await AIAdherenceService.generateTips(snapshot);
                setAdherenceAnalysis(result);
            }
        } catch (err) {
            console.error("AI Tips Error:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const sanitizeFilename = (name: string): string => {
        const clean = name.trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')  // remove acentos
            .replace(/[^a-zA-Z0-9\s]/g, '')   // remove pontuação
            .trim()
            .replace(/\s+/g, '_');             // espaços → underscore
        return clean || 'Plano_Alimentar';
    };

    const handleGeneratePDF = async () => {
        if (meals.length === 0) {
            alert('Adicione refeições ao plano antes de gerar o PDF.');
            return;
        }
        if (isGeneratingPdf) return;

        setIsGeneratingPdf(true);

        try {
            const state = stateRef.current; // ALWAYS FRESH

            // Monta snapshot a partir do estado local
            const localSnapshot = {
                patient: {
                    name: patient.name,
                    age: patientAge,
                    gender: patient.gender,
                    diagnoses: patient.clinicalSummary?.activeDiagnoses || [],
                    objective: patient.clinicalSummary?.clinicalGoal || 'Manutenção da saúde',
                    activityFactor: state.calcActivityFactor,
                    kcalTarget: state.targetKcal,
                    macroTargets: {
                        protein: state.macroResults.protein.g,
                        carbs: state.macroResults.carbs.g,
                        fat: state.macroResults.fat.g,
                    }
                },
                plan: {
                    id: currentPlanId || 'draft',
                    title: state.planTitle || 'Plano Alimentar',
                    meals: state.meals,
                },
                totals: dailyTotals,
            };

            setSnapshotForPdf(localSnapshot);

            // Aguarda o React re-renderizar o conteúdo no DOM (800ms para segurança)
            await new Promise(resolve => setTimeout(resolve, 800));

            const element = pdfRef.current;
            if (!element) throw new Error('Elemento de impressão não encontrado no DOM.');

            const filename = `Plano_Alimentar_${sanitizeFilename(patient.name)}.pdf`;
            const opt = {
                margin: 10,
                filename: filename,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, windowWidth: 794 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default || html2pdfModule;

            if (typeof html2pdf !== 'function') {
                throw new Error("Falha ao carregar a biblioteca de PDF.");
            }

            await html2pdf().set(opt).from(element).save();

        } catch (err) {
            console.error('[PDF] Critical Error:', err);
            alert('Erro ao gerar PDF: ' + String(err));
        } finally {
            setIsGeneratingPdf(false);
            setSnapshotForPdf(null);
        }
    };




    const formatMealItemQuantity = (item: MealItem) => {
        if (item.quantity === 1) {
            return item.unit;
        }
        return `${item.quantity}x ${item.unit}`;
    };


    return (
        <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 ${isManagerMode ? 'text-gray-100' : 'text-slate-800'}`}>

            {/* TOP TOOLBAR: PLAN SELECTION & MANAGEMENT */}
            <div className={`xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border shadow-sm ${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col w-full md:w-auto">
                        <label className={`text-[10px] uppercase font-bold mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Plano Selecionado</label>
                        <select
                            value={currentPlanId || ''}
                            onChange={(e) => {
                                if (e.target.value === 'NEW') initNewDraft();
                                else handlePlanSelection(e.target.value);
                            }}
                            className={`border rounded p-2 text-sm font-medium min-w-[250px] ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-emerald-300 text-emerald-900'}`}
                        >
                            {plansList.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.status === 'ATIVO' ? '(ATIVO) ' : ''}{p.title || 'Plano sem nome'} - {new Date(p.createdAt).toLocaleDateString()}
                                </option>
                            ))}
                            {(!currentPlanId && plansList.length === 0) && <option value="">Novo Rascunho</option>}
                        </select>
                    </div>
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); initNewDraft(); }} className={`mt-4 px-3 py-2 rounded text-xs font-bold border ${isManagerMode ? 'border-gray-600 hover:bg-gray-700' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'}`}>
                        + Novo
                    </button>
                </div>

                <div className="flex items-center gap-4 w-full justify-center md:justify-center">
                    <div className="flex flex-col w-full md:w-auto">
                        <label className={`text-[10px] uppercase font-bold mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Metodologia</label>
                        <select
                            value={planMethodology}
                            onChange={(e) => setPlanMethodology(e.target.value as any)}
                            className={`border rounded p-2 text-sm font-medium ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-emerald-300 text-emerald-900'}`}
                        >
                            <option value="ALIMENTOS">Cálculo por Alimentos</option>
                            <option value="EQUIVALENTES">Equivalentes (Smart Pix)</option>
                            <option value="QUALITATIVA">Qualitativa (Sem Macros)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full justify-end">
                    {syncStatus && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${syncStatus.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>{syncStatus}</span>
                    )}
                    {currentPlanId && (
                        <>
                            <button type="button" onClick={handleAnalyzeWithAI} data-html2pdf-ignore disabled={isAnalyzing} className={`px-3 py-2 text-xs font-bold rounded shadow-sm border flex items-center gap-1 ${isAnalyzing ? 'bg-gray-200' : (isManagerMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-50 text-purple-700')}`}>{isAnalyzing ? '...' : <><Icons.Brain /> Analisar</>}</button>
                            <button type="button" onClick={handleGenerateAdherenceTips} data-html2pdf-ignore disabled={isAnalyzing} className={`px-3 py-2 text-xs font-bold rounded shadow-sm border flex items-center gap-1 ${isAnalyzing ? 'bg-gray-200' : (isManagerMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700')}`}>{isAnalyzing ? '...' : <>🚀 Adesão</>}</button>
                            <button type="button" onClick={handleGeneratePDF} data-html2pdf-ignore disabled={isGeneratingPdf} className={`px-3 py-2 text-xs font-bold rounded shadow-sm border flex items-center gap-1 ${isGeneratingPdf ? 'bg-gray-200' : (isManagerMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-slate-700')}`}>{isGeneratingPdf ? '...' : <><Icons.FileText /> PDF</>}</button>
                        </>
                    )}
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSavePlan(); }} data-html2pdf-ignore className={`px-6 py-2 text-sm font-bold rounded text-white shadow-sm flex items-center gap-2 ${isManagerMode ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                        <span>💾</span> Salvar Plano
                    </button>
                </div>
            </div>

            {/* LEFT COLUMN */}
            <div className="space-y-6">
                {/* Energy Calculator */}
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-sm rounded-xl p-5 border relative overflow-hidden`}>
                    {/* Header com Manual Toggle */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h3 className={`text-sm font-black uppercase tracking-tighter ${isManagerMode ? 'text-indigo-400' : 'text-emerald-700'}`}>Estimativa Energética</h3>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Precisão Diagnóstica</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <label className="text-[10px] uppercase font-black text-gray-500">Manual</label>
                            <input type="checkbox" checked={isManualMode} onChange={e => setIsManualMode(e.target.checked)} className="toggle-checkbox" />
                        </div>
                    </div>

                    {!calculatedResults.isValid && !isManualMode && (
                        <div className="mb-4 p-3 bg-red-50 text-red-800 text-[11px] rounded-xl border border-red-100 flex items-center gap-2">
                            <span>⚠️</span> <span>Preencha os dados básicos do paciente (Anamnese/Antropometria).</span>
                        </div>
                    )}

                    {!isManualMode && calculatedResults.isValid && (
                        <div className="mb-4 p-2 bg-emerald-50 text-emerald-800 text-[10px] rounded-lg border border-emerald-100 flex items-center gap-2">
                            <span>✅</span> <span>Dados sincronizados com o prontuário.</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* 0. Dados Base (Somente se Manual) */}
                        {isManualMode && (
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                <InputRow label="Peso (kg)" value={calculationInputs.weight} unit="kg" disabled={!isManualMode} onChange={setManualWeight} />
                                <InputRow label="Altura (cm)" value={calculationInputs.height} unit="cm" disabled={!isManualMode} onChange={setManualHeight} />
                            </div>
                        )}

                        {/* 1. Perfil e Protocolo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase font-black text-slate-400 mb-1">Perfil do Paciente</label>
                                <select
                                    value={patientProfile}
                                    onChange={(e) => setPatientProfile(e.target.value as any)}
                                    className={`border rounded-lg p-2 text-xs font-bold transition-all ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                                >
                                    {Object.entries(PROFILE_CONFIGS).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase font-black text-slate-400 mb-1">Protocolo Base</label>
                                <select
                                    value={calcFormula}
                                    onChange={(e) => setCalcFormula(e.target.value as any)}
                                    className={`border rounded-lg p-2 text-xs font-bold transition-all ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                                >
                                    {(PROFILE_CONFIGS[patientProfile as keyof typeof PROFILE_CONFIGS] || PROFILE_CONFIGS.ADULTO_EUTROFICO).formulas.map(f => (
                                        <option key={f} value={f}>{f.replace('_', ' ')}</option>
                                    ))}
                                    <option value="MANUAL">Customizado (25 kcal/kg)</option>
                                </select>
                            </div>
                        </div>

                        {/* 1.5 Seletor de Trimestre (Somente Gestante) */}
                        {patientProfile === 'GESTANTE' && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-top-1">
                                <label className="text-[10px] uppercase font-black text-slate-400 mb-1">Trimestre Gestacional</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setPregnancyTrimestre(t as any)}
                                            className={`flex-1 p-2 rounded-lg text-xs font-bold transition-all border ${pregnancyTrimestre === t
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                                : isManagerMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-slate-600'
                                                }`}
                                        >
                                            {t}º Trimestre
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Variáveis de Ajuste (FA / FI) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase font-black text-slate-400 mb-1">Fator Atividade (FA)</label>
                                <select
                                    value={calcActivityFactor}
                                    onChange={(e) => setCalcActivityFactor(Number(e.target.value))}
                                    className={`border rounded-lg p-2 text-xs font-bold transition-all ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                                >
                                    {ACTIVITY_FACTORS_DETAILED.map(fa => (
                                        <option key={fa.value} value={fa.value}>{fa.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase font-black text-slate-400 mb-1">Fator Injúria (FI)</label>
                                <select
                                    value={calcInjuryFactor}
                                    onChange={(e) => setCalcInjuryFactor(Number(e.target.value))}
                                    className={`border rounded-lg p-2 text-xs font-bold transition-all ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                                >
                                    {INJURY_FACTORS.map(fi => (
                                        <option key={fi.value} value={fi.value}>{fi.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 3. Módulo de Amputados Expansível */}
                        <div>
                            <button
                                onClick={() => setIsAmputeeModuleOpen(!isAmputeeModuleOpen)}
                                className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase hover:text-emerald-700 underline decoration-dotted transition-all"
                            >
                                <Icons.Plus className="w-3 h-3" /> {amputations.length > 0 ? `${amputations.length} Amputações selecionadas` : 'Adicionar Amputações'}
                            </button>

                            {isAmputeeModuleOpen && (
                                <div className="mt-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 animate-fadeIn">
                                    <p className="text-[9px] text-emerald-800 font-bold mb-3 uppercase flex items-center gap-1">Ajuste de Massa Metabólica (%)</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {AMPUTATION_MEMBERS.map(member => (
                                            <label key={member.name} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={amputations.some(a => a.limb === member.name)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAmputations([...amputations, { limb: member.name, percent: member.percent }]);
                                                        } else {
                                                            setAmputations(amputations.filter(a => a.limb !== member.name));
                                                        }
                                                    }}
                                                    className="w-3 h-3 rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className="text-[10px] text-slate-600 group-hover:text-emerald-700 font-medium">{member.name} ({member.percent}%)</span>
                                            </label>
                                        ))}
                                    </div>
                                    {amputations.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-emerald-100 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-emerald-800 uppercase">Peso Corrigido:</span>
                                            <span className="text-xs font-black text-emerald-900">{calculatedResults.weightAdjusted} kg</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. Barra de Ajuste de Meta (Slider) */}
                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] uppercase font-black text-slate-400">Ajuste de Meta Final</label>
                                <span className={`text-[11px] font-black ${caloricGoalAdjustment > 0 ? 'text-indigo-600' : (caloricGoalAdjustment < 0 ? 'text-red-500' : 'text-slate-500')}`}>
                                    {caloricGoalAdjustment > 0 ? `+${caloricGoalAdjustment}` : caloricGoalAdjustment}%
                                </span>
                            </div>
                            <input
                                type="range" min="-40" max="40" step="5"
                                value={caloricGoalAdjustment}
                                onChange={(e) => setCaloricGoalAdjustment(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between mt-1 text-[8px] font-bold text-gray-400 uppercase">
                                <span>Déficit (-40%)</span>
                                <span>Manutenção</span>
                                <span>Superávit (+40%)</span>
                            </div>
                        </div>

                        {/* 5. Display Principal (TMB e GET) + Faixa Segura */}
                        <div className="space-y-3 pt-2">
                            {/* Faixa de Segurança Visual */}
                            <div className="relative pt-4">
                                <div className="h-1.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
                                    <div className="h-full bg-slate-100" style={{ width: '40%' }}></div>
                                    <div className="h-full bg-emerald-500/20 border-x border-emerald-500/40" style={{ width: '20%' }} title="Zona de Segurança Clínica (+/- 10%)"></div>
                                    <div className="h-full bg-slate-100" style={{ width: '40%' }}></div>
                                </div>
                                <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                    <span>{calculatedResults.safetyRange.min} kcal</span>
                                    <span className="text-emerald-600">Alvo Central (GET)</span>
                                    <span>{calculatedResults.safetyRange.max} kcal</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-xl text-center border ${isManagerMode ? 'bg-gray-700/50 border-gray-600 text-gray-200' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                    <p className="text-[9px] uppercase font-black opacity-60">TMB Basal ({calcFormula})</p>
                                    <p className="text-xl font-bold">{calculatedResults.bmr} <span className="text-[10px] font-medium opacity-50">kcal</span></p>
                                </div>
                                <div className={`p-3 rounded-xl text-center border ring-2 ring-emerald-500/10 ${isManagerMode ? 'bg-emerald-900/30 border-emerald-700 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                                    <p className="text-[9px] uppercase font-black text-emerald-600">GET Total</p>
                                    <p className="text-xl font-black">{calculatedResults.tdee} <span className="text-[10px] font-medium text-emerald-600">kcal</span></p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl text-center border shadow-sm transition-all ${isManagerMode ? 'bg-indigo-900/50 border-indigo-700' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>
                                <p className="text-[10px] uppercase font-black opacity-80 mb-1">Meta Atribuída (Prescrição)</p>
                                <p className="text-3xl font-black">{targetKcal} <span className="text-sm font-medium opacity-60">kcal</span></p>
                                <button
                                    onClick={() => setTargetKcal(calculatedResults.kcalTarget)}
                                    className="mt-2 text-[9px] font-bold uppercase py-1 px-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                                >
                                    🔄 SINCRONIZAR COM CALCULADOR
                                </button>
                            </div>
                        </div>

                        {/* 6. Memória de Cálculo Expansível */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowCalcMemory(!showCalcMemory)}
                                className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-all"
                            >
                                <Icons.ChevronDown className={`w-3 h-3 transition-transform ${showCalcMemory ? 'rotate-180' : ''}`} />
                                Ver Memória de Cálculo
                            </button>
                            {showCalcMemory && (
                                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[9px] text-slate-500 leading-relaxed animate-slideDown overflow-x-auto">
                                    {calculatedResults.calculationMemory}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Daily Totals Summary */}
                <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-sm rounded-xl p-5 border`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-sm font-bold uppercase tracking-wide ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Acompanhamento de Metas</h3>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Real vs Meta</span>
                    </div>

                    <div className="space-y-4">
                        {/* CALORIAS PROGRESS */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                                <span>Energia (Kcal)</span>
                                <span className={dailyTotals.calories > targetKcal * 1.05 ? 'text-red-500' : (isManagerMode ? 'text-indigo-400' : 'text-emerald-600')}>
                                    {dailyTotals.calories} / {targetKcal}
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-200/50">
                                <div
                                    className={`h-full transition-all duration-700 ease-out ${dailyTotals.calories > targetKcal * 1.05 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                                    style={{ width: `${Math.min(100, (dailyTotals.calories / (targetKcal || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* MACROS HUD */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Proteína', val: dailyTotals.protein, target: macroResults.protein.g, color: 'blue', key: 'P' },
                                { label: 'Carbo', val: dailyTotals.carbs, target: macroResults.carbs.g, color: 'green', key: 'C' },
                                { label: 'Gordura', val: dailyTotals.fat, target: macroResults.fat.g, color: 'yellow', key: 'G' }
                            ].map(m => (
                                <div key={m.key} className="space-y-1">
                                    <div className="flex justify-between items-center px-0.5">
                                        <span className={`text-[10px] font-black text-${m.color}-500 uppercase`}>{m.key}</span>
                                        <span className="text-[9px] font-bold text-gray-500">{m.val}g</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-200/30">
                                        <div
                                            className={`h-full bg-${m.color}-500 transition-all duration-700 ease-out shadow-sm`}
                                            style={{ width: `${Math.min(100, (m.val / (m.target || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[8px] text-center text-gray-400">Meta: {m.target}g</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button onClick={() => setShowMicrosModal(true)} className={`text-xs py-2 border rounded font-bold transition-all ${isManagerMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'}`}>Micronutrientes</button>
                            <button onClick={() => setShowShoppingListModal(true)} className={`text-xs py-2 border rounded font-bold transition-all ${isManagerMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'}`}>Lista de Compras</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CENTER/RIGHT COLUMN */}
            <div className="xl:col-span-2 space-y-6">
                <div className="space-y-6 animate-fadeIn">

                    {/* AI ANALYSIS RESULT SECTION (NEW) */}
                    {analysisResult && (
                        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-100'} shadow-md rounded-xl p-6 border animate-slideIn`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${isManagerMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                    <Icons.Brain /> Análise Inteligente do Plano
                                </h3>
                                {analysisResult.isFallback && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">Modo Offline (Determinístico)</span>
                                )}
                            </div>

                            <div className="mb-4">
                                <p className={`text-sm italic ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>"{analysisResult.summary}"</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                                <div className={`p-4 rounded-lg ${isManagerMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                    <h4 className="font-bold mb-2">Pontos Fortes & Achados</h4>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        {analysisResult.guidelines.keyFindings.map((k, i) => <li key={i}>{k}</li>)}
                                    </ul>
                                </div>
                                <div className={`p-4 rounded-lg ${isManagerMode ? 'bg-gray-700' : 'bg-red-50'}`}>
                                    <h4 className="font-bold mb-2 text-red-600">Atenção / Riscos</h4>
                                    <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
                                        {analysisResult.guidelines.risks.length > 0 ? analysisResult.guidelines.risks.map((k, i) => <li key={i}>{k}</li>) : <li>Nenhum risco crítico identificado.</li>}
                                    </ul>
                                </div>
                            </div>

                            {/* Substitutions */}
                            {analysisResult.substitutions.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-sm mb-3">Sugestões de Substituição (Guia Alimentar)</h4>
                                    <div className="space-y-3">
                                        {analysisResult.substitutions.map((sub, idx) => (
                                            <div key={idx} className={`p-3 rounded border text-xs ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                                <p className="font-bold mb-1">{sub.foodName} <span className="font-normal text-gray-500">({sub.foodCategory})</span></p>
                                                <ul className="space-y-1 pl-2 border-l-2 border-green-300">
                                                    {sub.replacements.map((r, ri) => (
                                                        <li key={ri}>
                                                            <span className="font-semibold text-green-700">{r.name}</span>: {r.reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 text-[10px] text-gray-400 text-center">
                                {analysisResult.disclaimers.join(' ')}
                            </div>
                        </div>
                    )}

                    {adherenceAnalysis && (
                        <div className={`p-5 rounded-xl border animate-slideUp shadow-sm ${isManagerMode ? 'bg-gray-800 border-blue-900/50' : 'bg-blue-50/40 border-blue-100'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isManagerMode ? 'text-blue-400' : 'text-blue-800'}`}>
                                    🚀 Estratégias de Adesão (IA)
                                </h4>
                                <button onClick={() => setAdherenceAnalysis(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                            </div>
                            <p className="text-sm italic text-gray-500 mb-4 px-3 py-2 bg-white/50 rounded-lg border border-blue-50 leading-relaxed italic">"{adherenceAnalysis.summary}"</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {adherenceAnalysis.tips.map((tip, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{tip.category}</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 mb-1 leading-tight">{tip.tip}</p>
                                        <p className="text-[11px] text-gray-500 leading-tight">{tip.rationale}</p>
                                    </div>
                                ))}
                            </div>
                            {adherenceAnalysis.idealTiming && (
                                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                                    <span className="text-xl">🕒</span>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Sugestão de Timing</p>
                                        <p className="text-xs text-indigo-900 font-medium">{adherenceAnalysis.idealTiming}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONFIG & ACTIONS */}
                    <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-sm rounded-xl p-6 border`}>
                        <div className="mb-6">
                            <label className={`block text-xs font-bold uppercase mb-1 ${isManagerMode ? 'text-gray-400' : 'text-emerald-700'}`}>Nome do Plano (Identificação)</label>
                            <input type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)} className={`w-full p-2 border rounded text-base font-bold ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200 text-slate-800'}`} placeholder="Ex: Hipertrofia Fase 1" />
                        </div>

                        {/* Macro Targets Inputs */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estratégia</label>
                                <input type="text" value={planStrategy} onChange={e => setPlanStrategy(e.target.value)} className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-slate-200'}`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Metodologia</label>
                                <select value={planMethodology} onChange={e => setPlanMethodology(e.target.value as any)} className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-slate-200'}`}>
                                    <option value="ALIMENTOS">Plano por Alimentos</option>
                                    <option value="EQUIVALENTES">Lista de Substituição</option>
                                </select>
                            </div>
                        </div>
                        {/* Targets Visualization */}
                        <div className={`p-4 rounded border ${isManagerMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Metas Diárias</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">Meta Kcal:</span>
                                    <input type="number" value={targetKcal} onChange={e => setTargetKcal(Math.round(parseFloat(e.target.value)))} className="w-16 p-1 text-right border rounded text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="flex flex-col items-center">
                                    <span className="text-blue-500 font-bold text-[10px] uppercase">Prot (g | g/kg)</span>
                                    <div className="flex items-center gap-1">
                                        <input type="number" value={proteinGrams} onChange={e => setProteinGrams(parseFloat(e.target.value))} className="w-12 text-center border-b bg-transparent" />
                                        <span className="text-[10px] text-gray-400">|</span>
                                        <input type="number" value={calculationInputs.weight > 0 ? parseFloat((proteinGrams / calculationInputs.weight).toFixed(1)) : 0} onChange={e => setProteinGrams(parseFloat(e.target.value) * calculationInputs.weight)} className="w-10 text-center border-b bg-transparent text-gray-500 text-[10px]" step="0.1" />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-yellow-500 font-bold text-[10px] uppercase">Gord (g | g/kg)</span>
                                    <div className="flex items-center gap-1">
                                        <input type="number" value={fatGrams} onChange={e => setFatGrams(parseFloat(e.target.value))} className="w-12 text-center border-b bg-transparent" />
                                        <span className="text-[10px] text-gray-400">|</span>
                                        <input type="number" value={calculationInputs.weight > 0 ? parseFloat((fatGrams / calculationInputs.weight).toFixed(1)) : 0} onChange={e => setFatGrams(parseFloat(e.target.value) * calculationInputs.weight)} className="w-10 text-center border-b bg-transparent text-gray-500 text-[10px]" step="0.1" />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-green-500 font-bold text-[10px] uppercase">Carb (g | g/kg)</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">{macroResults.carbs.g}</span>
                                        <span className="text-[10px] text-gray-400">|</span>
                                        <span className="text-[10px] text-gray-500">{calculationInputs.weight > 0 ? (macroResults.carbs.g / calculationInputs.weight).toFixed(1) : 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MEALS LIST - DYNAMIC HEADER */}
                    <div className="flex justify-between items-center">
                        <h3 className={`text-lg font-bold ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>Cronograma de Refeições</h3>
                        <button onClick={handleAddMeal} className={`px-3 py-1 text-xs font-bold rounded border shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}>
                            + Refeição
                        </button>
                    </div>

                    <div className="space-y-4">
                        {meals.length === 0 && <p className="text-center text-gray-500 py-8 italic border-2 border-dashed rounded-xl">Nenhuma refeição cadastrada.</p>}

                        {meals.map((meal, mIndex) => {
                            const mealTotal = NutrientCalc.calculateDailyTotals([meal]);
                            return (
                                <div key={meal.id} className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-sm rounded-xl border overflow-hidden`}>
                                    <div className={`p-3 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            {/* Actions Menu */}
                                            <div className="flex flex-col gap-0.5 mr-1">
                                                <button onClick={() => handleMoveMeal(mIndex, 'up')} disabled={mIndex === 0} className={`text-[8px] hover:font-bold ${mIndex === 0 ? 'opacity-20' : ''}`}>▲</button>
                                                <button onClick={() => handleMoveMeal(mIndex, 'down')} disabled={mIndex === meals.length - 1} className={`text-[8px] hover:font-bold ${mIndex === meals.length - 1 ? 'opacity-20' : ''}`}>▼</button>
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2 cursor-pointer hover:underline" onClick={() => handleEditMeal(meal)}>
                                                    <h4 className={`font-bold ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>{meal.name}</h4>
                                                    {meal.time && <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1 rounded">{meal.time}</span>}
                                                    <span className="text-xs text-blue-500">✎</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 block">
                                                    {mealTotal.calories} kcal (P:{mealTotal.protein} C:{mealTotal.carbs} G:{mealTotal.fat})
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDuplicateMeal(meal)} className={`text-xs px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors font-medium`} title="Duplicar Refeição">Duplicar</button>
                                            <button onClick={() => handleDeleteMeal(meal.id)} className={`text-xs px-2 py-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors font-medium`} title="Remover Refeição">Excluir</button>
                                            <button onClick={() => openAddItemModal(meal.id)} className={`text-xs px-3 py-1 rounded font-bold border ${isManagerMode ? 'border-gray-500 text-gray-300 hover:bg-gray-600' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>+ Item</button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        {meal.items.length === 0 ? <p className="text-xs text-gray-400 italic text-center">Vazio.</p> : (
                                            <ul className="space-y-2">
                                                {meal.items.map((item, idx) => (
                                                    <li
                                                        key={idx}
                                                        className={`flex flex-col gap-1 p-2 rounded border border-transparent transition-all ${isManagerMode ? 'bg-gray-900' : 'bg-gray-50 border-slate-100 hover:border-emerald-200'}`}
                                                    >
                                                        <div className="flex justify-between items-center group cursor-pointer" onClick={() => openAddItemModal(meal.id, false, idx)}>
                                                            <div className="flex flex-col">
                                                                <span className={`font-medium flex items-center gap-2 ${isManagerMode ? 'text-gray-200' : 'text-slate-700'}`}>
                                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">✏️</span>
                                                                    <span><strong className={`${isManagerMode ? 'text-indigo-400' : 'text-emerald-700'}`}>{formatMealItemQuantity(item)}</strong> - {item.customName || item.name}</span>
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 pl-6">
                                                                    {item.calculatedCalories} kcal | P {item.calculatedProtein} | C {item.calculatedCarbs} | G {item.calculatedFat}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {!item.foodId.startsWith('custom') && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleOpenSubstitutes(meal.id, idx, item.foodId); }}
                                                                        className={`p-1.5 rounded-full transition-colors ${isManagerMode ? 'hover:bg-gray-700 text-indigo-400' : 'hover:bg-emerald-100 text-emerald-600'}`}
                                                                        title="Opções de Substituição"
                                                                    >
                                                                        <Icons.DotsVertical className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(meal.id, idx); }} className="text-red-400 hover:text-red-700 p-1 transition-colors" title="Remover item">
                                                                    <Icons.Plus className="w-5 h-5 rotate-45" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* LISTA DE SUBSTITUTOS (OPÇÕES) */}
                                                        {item.substitutes && item.substitutes.length > 0 && (
                                                            <div className="ml-6 space-y-1 mt-1 border-l-2 border-emerald-100 pl-3">
                                                                {item.substitutes.map((sub, sIdx) => (
                                                                    <div key={sIdx} className="flex justify-between items-center py-1 group/sub scale-95 origin-left">
                                                                        <div className="text-[11px] text-slate-500 italic">
                                                                            <span className="font-bold text-emerald-600 not-italic uppercase mr-1 text-[9px]">OU:</span>
                                                                            {formatMealItemQuantity(sub)} - {sub.customName || sub.name}
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            {!sub.foodId.startsWith('custom') && (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenSubstitutes(meal.id, idx, sub.foodId); }}
                                                                                    className={`p-1 opacity-0 group-hover/sub:opacity-100 rounded-full transition-all ${isManagerMode ? 'hover:bg-gray-700 text-indigo-400' : 'hover:bg-emerald-50 text-emerald-600'}`}
                                                                                    title="Substituir esta opção"
                                                                                >
                                                                                    <Icons.DotsVertical className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleRemoveSubstitute(meal.id, idx, sIdx); }}
                                                                                className="opacity-0 group-hover/sub:opacity-100 text-red-400 font-bold text-[10px] hover:text-red-600 px-1"
                                                                            >
                                                                                remover
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}

            <AddFoodModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onConfirm={handleConfirmAddItem}
                isManagerMode={isManagerMode}
            />

            {editingItem && (
                <EditFoodModal
                    isOpen={isEditItemModalOpen}
                    onClose={() => setIsEditItemModalOpen(false)}
                    onConfirm={handleConfirmAddItem}
                    item={editingItem}
                    isManagerMode={isManagerMode}
                />
            )}

            {/* MEAL CONFIG MODAL */}
            {isMealModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-sm p-6`}>
                        <h3 className="text-lg font-bold mb-4">{mealForm.id ? 'Editar Refeição' : 'Nova Refeição'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold uppercase mb-1 block">Nome</label>
                                <input type="text" value={mealForm.name} onChange={e => setMealForm({ ...mealForm, name: e.target.value })} className={`w-full p-2 border rounded ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white'}`} placeholder="Ex: Pré-treino" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase mb-1 block">Horário (Opcional)</label>
                                <input type="time" value={mealForm.time} onChange={e => setMealForm({ ...mealForm, time: e.target.value })} className={`w-full p-2 border rounded ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white'}`} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                            <button onClick={() => setIsMealModalOpen(false)} className="px-3 py-1.5 text-sm border rounded">Cancelar</button>
                            <button onClick={handleSaveMealConfig} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MICRONUTRIENTS MODAL (REVISED: DETERMINISTIC TABLE) */}
            {showMicrosModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-black'} rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col max-h-[80vh]`}>
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold">Tabela de Nutrientes do Plano</h3>
                            <button onClick={() => setShowMicrosModal(false)}>✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className={`${isManagerMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'}`}>
                                    <tr>
                                        <th className="text-left p-2">Nutriente</th>
                                        <th className="text-right p-2">Total Calculado</th>
                                        <th className="text-center p-2">Obs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Macronutrientes */}
                                    <tr className="font-bold bg-gray-50/10">
                                        <td className={`p-2 ${isManagerMode ? 'text-white' : 'text-black'}`}>Calorias</td>
                                        <td className={`text-right p-2 ${isManagerMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{dailyTotals.calories} kcal</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td className={`p-2 pl-4 ${isManagerMode ? 'text-gray-300' : 'text-black'}`}>Proteína</td>
                                        <td className={`text-right p-2 ${isManagerMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{dailyTotals.protein} g</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td className={`p-2 pl-4 ${isManagerMode ? 'text-gray-300' : 'text-black'}`}>Carboidratos</td>
                                        <td className={`text-right p-2 ${isManagerMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{dailyTotals.carbs} g</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td className={`p-2 pl-4 ${isManagerMode ? 'text-gray-300' : 'text-black'}`}>Gorduras Totais</td>
                                        <td className={`text-right p-2 ${isManagerMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{dailyTotals.fat} g</td>
                                        <td></td>
                                    </tr>
                                    {/* Micronutrientes c/ DRI Analysis */}
                                    <tr><td colSpan={3} className="p-2 font-bold text-xs uppercase bg-gray-50/5 mt-2">Análise de Micronutrientes (vs DRIs)</td></tr>
                                    {[
                                        { label: 'Fibras', val: dailyTotals.fiber, unit: 'g', ref: 25, isMax: false },
                                        { label: 'Sódio', val: dailyTotals.sodium, unit: 'mg', ref: 2300, isMax: true },
                                        { label: 'Potássio', val: dailyTotals.potassium, unit: 'mg', ref: 4700, isMax: false },
                                        { label: 'Cálcio', val: dailyTotals.calcium, unit: 'mg', ref: 1000, isMax: false },
                                        { label: 'Ferro', val: dailyTotals.iron, unit: 'mg', ref: 8, isMax: false },
                                        { label: 'Vitamina C', val: dailyTotals.vitaminC, unit: 'mg', ref: 75, isMax: false },
                                    ].map(m => {
                                        const pct = Math.round((m.val / m.ref) * 100);
                                        const isLow = !m.isMax && pct < 70;
                                        const isHigh = m.isMax && pct > 100;
                                        return (
                                            <tr key={m.label} className="border-b border-gray-100 dark:border-gray-700">
                                                <td className={`p-2 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.label}</td>
                                                <td className="text-right p-2 font-bold">
                                                    {m.val} {m.unit}
                                                    <div className="text-[10px] text-gray-400 font-normal">DRI: {m.ref}{m.unit}</div>
                                                </td>
                                                <td className="text-center p-2">
                                                    <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold inline-block ${isLow ? 'bg-yellow-100 text-yellow-700' :
                                                        isHigh ? 'bg-red-100 text-red-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {pct}% {m.isMax && pct > 100 ? 'ALTO' : (pct < 70 ? 'BAIXO' : 'OK')}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <p className={`text-[10px] mt-4 text-center ${isManagerMode ? 'text-gray-500' : 'text-black'}`}>
                                * Valores calculados com base na Tabela TACO/IBGE e densidade nutricional dos alimentos cadastrados.
                                Alguns micronutrientes podem estar subestimados se o cadastro do alimento estiver incompleto.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SHOPPING LIST MODAL */}
            {showShoppingListModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col`}>
                        <h3 className="text-lg font-bold mb-4">Lista de Compras (Semanal)</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {Object.entries(ShoppingListService.generate(meals)).map(([category, items]) => (
                                <div key={category} className="mb-4">
                                    <h4 className="font-bold text-xs uppercase bg-gray-100 dark:bg-gray-700 p-1 mb-2 rounded">{category}</h4>
                                    <ul className="text-sm space-y-1">
                                        {items.map((item, i) => (
                                            <li key={i} className="flex justify-between">
                                                <span>{item.name}</span>
                                                <span className="font-mono">{(item.totalGrams * 7).toFixed(0)}g (x7 dias)</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowShoppingListModal(false)} className="mt-4 w-full py-2 border rounded font-bold">Fechar</button>
                    </div>
                </div>
            )}



            {/* SUBSTITUTES MODAL (Centered for better UX) */}
            {showSubstitutesDrawer && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className={`w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col animate-scaleUp ${isManagerMode ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-900'}`} style={{ maxHeight: '85vh' }}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-bold text-lg">Substituições Sugeridas</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ajuste técnico com base na categoria</p>
                            </div>
                            <button onClick={() => { setShowSubstitutesDrawer(null); setSubConfigItem(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">✕</button>
                        </div>

                        {/* TABS (Hidden during config) */}
                        {!subConfigItem && (
                            <div className="flex border-b mb-4 dark:border-gray-700">
                                <button
                                    onClick={() => { setSubTab('SUGGESTIONS'); setSubConfigItem(null); }}
                                    className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${subTab === 'SUGGESTIONS' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'}`}
                                >
                                    Sugestões do Grupo
                                </button>
                                <button
                                    onClick={() => { setSubTab('SEARCH'); setSubConfigItem(null); }}
                                    className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${subTab === 'SEARCH' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'}`}
                                >
                                    Busca Livre
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 min-h-[300px]">
                            {subConfigItem ? (
                                <div className={`p-4 rounded-2xl border-2 animate-fadeIn ${isManagerMode ? 'bg-gray-700/50 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'}`}>
                                    <h4 className="font-bold text-emerald-600 mb-1">Configurar Seleção</h4>
                                    <div className="text-sm font-medium mb-4">{subConfigItem.namePt}</div>

                                    <div className="mb-4">
                                        <label className="text-[10px] uppercase font-bold text-gray-400">Nome para Impressão</label>
                                        <input
                                            type="text"
                                            value={subConfigCustomName}
                                            onChange={(e) => setSubConfigCustomName(e.target.value)}
                                            className={`w-full p-2 mt-1 rounded-lg border text-sm font-medium ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-emerald-200 focus:ring-2 focus:ring-emerald-500'}`}
                                            placeholder="Ex: Café Expresso"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={subConfigPortionIdx === -1 ? 'col-span-1' : 'col-span-1'}>
                                            <label className="text-[10px] uppercase font-bold text-gray-400">Porção</label>
                                            <select
                                                value={subConfigPortionIdx}
                                                onChange={(e) => {
                                                    setSubConfigPortionIdx(parseInt(e.target.value));
                                                    if (parseInt(e.target.value) !== -1) setSubConfigManualWeight('');
                                                }}
                                                className={`w-full p-2 mt-1 rounded-lg border text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                            >
                                                {subConfigItem.portions.map((p, i) => (
                                                    <option key={i} value={i}>{p.label} ({p.grams}g)</option>
                                                ))}
                                                <option value="-1">Outra (digitar)</option>
                                            </select>
                                        </div>
                                        {subConfigPortionIdx === -1 && (
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400">Peso (g/mL)</label>
                                                <input
                                                    type="number"
                                                    value={subConfigManualWeight}
                                                    onChange={(e) => setSubConfigManualWeight(e.target.value)}
                                                    className={`w-full p-2 mt-1 rounded-lg border text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                                    placeholder="0"
                                                />
                                            </div>
                                        )}
                                        <div className={subConfigPortionIdx === -1 ? 'col-span-2' : 'col-span-1'}>
                                            <label className="text-[10px] uppercase font-bold text-gray-400">Qtd</label>
                                            <input
                                                type="number"
                                                value={subConfigQuantity}
                                                onChange={(e) => setSubConfigQuantity(parseFloat(e.target.value) || 0)}
                                                className={`w-full p-2 mt-1 rounded-lg border text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* PRÉVIA NUTRICIONAL */}
                                    {(() => {
                                        const nut = subConfigItem.nutrientsPer100g;
                                        let ratio = 0;
                                        if (subConfigPortionIdx === -1) {
                                            ratio = ((parseFloat(subConfigManualWeight) || 0) * subConfigQuantity) / 100;
                                        } else {
                                            const p = subConfigItem.portions[subConfigPortionIdx];
                                            ratio = (p.grams * subConfigQuantity) / 100;
                                        }
                                        const preview = {
                                            kcal: Math.round(nut.kcal * ratio),
                                            p: (nut.protein_g * ratio).toFixed(1),
                                            c: (nut.carb_g * ratio).toFixed(1),
                                            g: (nut.fat_g * ratio).toFixed(1)
                                        };
                                        return (
                                            <div className={`mt-4 p-3 rounded-xl flex justify-around text-center border ${isManagerMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-100'}`}>
                                                <div><div className="text-[9px] text-gray-400 uppercase">Kcal</div><div className="font-bold text-sm">{preview.kcal}</div></div>
                                                <div><div className="text-[9px] text-gray-400 uppercase">Prot</div><div className="font-bold text-sm text-blue-500">{preview.p}</div></div>
                                                <div><div className="text-[9px] text-gray-400 uppercase">Carb</div><div className="font-bold text-sm text-green-600">{preview.c}</div></div>
                                                <div><div className="text-[9px] text-gray-400 uppercase">Gord</div><div className="font-bold text-sm text-yellow-600">{preview.g}</div></div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex gap-2 mt-6">
                                        <button onClick={() => setSubConfigItem(null)} className="flex-1 py-2 text-sm font-bold rounded-xl border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Voltar</button>
                                        <button onClick={confirmSubstitution} className="flex-1 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">Confirmar</button>
                                    </div>
                                </div>
                            ) : subTab === 'SUGGESTIONS' ? (
                                <>
                                    <p className="text-xs text-gray-500 italic">Itens tecnicamente similares em calorias e macronutrientes.</p>
                                    <div className="space-y-2">
                                        {substituteCandidates.length === 0 ? (
                                            <p className="text-center italic text-gray-500 py-10 bg-gray-50 dark:bg-gray-700/30 rounded-lg">Sem substitutos diretos encontrados.</p>
                                        ) : (
                                            substituteCandidates.map(suggestion => {
                                                const cand = suggestion.food;
                                                const portionDesc = suggestion.isManualWeight
                                                    ? `${suggestion.suggestedWeightGrams}g`
                                                    : cand.portions[suggestion.suggestedPortionIdx]?.label;

                                                return (
                                                    <button key={cand.id} onClick={() => handlePreSelectSubstitution(cand, suggestion)} className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all ${isManagerMode ? 'border-gray-700 hover:bg-gray-700 hover:border-emerald-500/50' : 'border-slate-100 hover:bg-emerald-50 hover:border-emerald-200'}`}>
                                                        <div className="flex-1">
                                                            <div className="font-bold text-sm">{cand.namePt}</div>
                                                            <div className="text-[10px] text-gray-400 uppercase">{cand.category}</div>
                                                            <div className="text-[11px] text-emerald-600 font-bold mt-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full w-fit">
                                                                Sugerido: {suggestion.suggestedQuantity > 1 ? `${suggestion.suggestedQuantity}x ` : ''} {portionDesc}
                                                            </div>
                                                        </div>
                                                        <span className="text-emerald-600 font-bold text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded uppercase ml-2">Ajustar</span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Busque qualquer alimento..."
                                            value={subQuery}
                                            onChange={(e) => setSubQuery(e.target.value)}
                                            className={`w-full p-3 rounded-xl border text-sm focus:ring-2 focus:ring-emerald-500 outline-none ${isManagerMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            autoFocus
                                        />
                                        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                                            <Icons.Search />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {subSearchResults.length === 0 ? (
                                            <p className="text-center italic text-gray-500 py-10">Digite algo para buscar na base...</p>
                                        ) : (
                                            subSearchResults.map(cand => (
                                                <button key={cand.id} onClick={() => handlePreSelectSubstitution(cand)} className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all ${isManagerMode ? 'border-gray-700 hover:bg-gray-700 hover:border-emerald-500/50' : 'border-slate-100 hover:bg-emerald-50 hover:border-emerald-200'}`}>
                                                    <div>
                                                        <div className="font-bold text-sm">{cand.namePt}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">{cand.category} • {cand.nutrientsPer100g.kcal} kcal/100g</div>
                                                    </div>
                                                    <span className="text-emerald-600 font-bold text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded uppercase">Selecionar</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA DE IMPRESSÃO (Oculta mas capturada pelo html2pdf) */}
            <div className="fixed top-0 left-0 w-full opacity-0 pointer-events-none -z-50" data-html2pdf-ignore="false">
                <div ref={pdfRef} className="bg-white text-black font-sans px-[8mm] py-[12mm] w-[210mm] min-h-[297mm] shadow-2xl mx-auto">
                    {snapshotForPdf && (
                        <div className="flex flex-col h-full">
                            {/* CABEÇALHO */}
                            <div className="flex flex-col border-b-2 border-emerald-600 pb-4 mb-6">
                                <div className="flex justify-between items-start w-full">
                                    <div>
                                        <h1 className="text-2xl font-black text-emerald-800 tracking-tighter uppercase leading-none">Plano Alimentar</h1>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{snapshotForPdf.plan.title}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-slate-500 font-medium">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{patient.name}</p>
                                </div>
                            </div>

                            {/* RESUMO DE METAS */}
                            <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-50/80 p-5 rounded-xl border border-slate-200">
                                <div className="text-center border-r border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Meta Calórica</p>
                                    <p className="text-2xl font-black text-emerald-700 leading-none">{snapshotForPdf.patient.kcalTarget} <span className="text-xs">kcal</span></p>
                                </div>
                                <div className="text-center border-r border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Proteínas</p>
                                    <p className="text-xl font-bold text-slate-800 leading-none">{snapshotForPdf.patient.macroTargets.protein}g</p>
                                </div>
                                <div className="text-center border-r border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Carboidratos</p>
                                    <p className="text-xl font-bold text-slate-800 leading-none">{snapshotForPdf.patient.macroTargets.carbs}g</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Gorduras</p>
                                    <p className="text-xl font-bold text-slate-800 leading-none">{snapshotForPdf.patient.macroTargets.fat}g</p>
                                </div>
                            </div>

                            {/* REFEIÇÕES */}
                            <div className="space-y-6 flex-1">
                                {snapshotForPdf.plan.meals.map((m: any, i: number) => (
                                    m.items.length > 0 && (
                                        <div key={i} className="break-inside-avoid mb-6">
                                            <div className="flex justify-between items-center bg-gray-50 border-b-2 border-slate-200 p-2.5 rounded-t-md mb-3">
                                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{m.name}</h3>
                                                {m.time && <span className="text-[10px] font-mono font-bold text-gray-500">{m.time}</span>}
                                            </div>
                                            <div className="space-y-3 pl-3">
                                                {m.items.map((it: any, j: number) => (
                                                    <div key={j} className="mb-2 last:mb-0">
                                                        <div className="text-xs font-medium text-slate-800 flex items-start gap-3">
                                                            <span className="w-24 shrink-0 font-bold text-slate-600 text-right">• {formatMealItemQuantity(it).replace('x ', ' ')}</span>
                                                            <span className="flex-1 min-w-0 break-words leading-relaxed">{it.customName || it.name}</span>
                                                        </div>
                                                        {it.substitutes && it.substitutes.length > 0 && (
                                                            <div className="mt-2 ml-24 space-y-2 border-l border-emerald-100 pl-3">
                                                                {it.substitutes.map((sub: any, sIdx: number) => (
                                                                    <div key={sIdx} className="text-slate-500 text-[11px] flex items-start gap-2">
                                                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[8px] uppercase shrink-0 mt-0.5">OU</span>
                                                                        <span className="shrink-0 font-medium w-16 text-right">{formatMealItemQuantity(sub).replace('x ', ' ')}</span>
                                                                        <span className="italic leading-snug flex-1 min-w-0 break-words">{sub.customName || sub.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>

                            {/* ESTRATÉGIAS DE ADESÃO (IA) */}
                            {adherenceAnalysis && (
                                <div className="mt-8 pt-8 border-t-2 border-slate-100 break-inside-avoid">
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
                                        🚀 Estratégias para sua Adesão
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4 w-full">
                                        {adherenceAnalysis.tips.map((tip, idx) => (
                                            <div key={idx} className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/60 flex gap-4 items-start w-full">
                                                <div className="bg-emerald-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shrink-0 shadow-sm mt-0.5">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                                                            {tip.category}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 leading-snug mb-1 list-none">
                                                        {tip.tip}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 leading-relaxed italic border-t border-emerald-100/50 pt-1 mt-1">
                                                        {tip.rationale}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LISTA DE COMPRAS */}
                            <div className="mt-10 pt-8 border-t-2 border-slate-100 break-before-page">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-8 pb-3 border-b-2 border-slate-100 flex items-center gap-2">
                                    🛒 Lista de Compras Semanal
                                </h2>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-8 w-full max-w-full">
                                    {Object.entries(ShoppingListService.generate(snapshotForPdf.plan.meals)).map(([category, items]: [string, any[]]) => (
                                        items.length > 0 && (
                                            <div key={category} className="mb-2 w-full min-w-0">
                                                <h4 className="text-[10px] font-black text-emerald-700 bg-emerald-50 inline-block px-2.5 py-1 rounded-md uppercase mb-4 truncate max-w-full">{category}</h4>
                                                <div className="space-y-0.5">
                                                    {items.map((item: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-start text-xs text-slate-700 py-1.5 border-b border-dashed border-slate-200">
                                                            <span className="pr-2 leading-tight flex-1 break-words min-w-0">{item.name}</span>
                                                            <span className="font-black text-slate-900 whitespace-nowrap shrink-0 ml-2">{(item.totalGrams * 7).toFixed(0)} <span className="text-[10px] text-slate-500 font-bold ml-0.5">g</span></span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* RODAPÉ */}
                            <div className="mt-auto pt-8 flex justify-between items-end border-t border-slate-100">
                                <div className="text-[8px] text-slate-400">
                                    <p className="font-bold text-emerald-700 uppercase mb-1">ControlClin SaaS</p>
                                    <p>© {new Date().getFullYear()} - Documento validado cientificamente</p>
                                </div>
                                <div className="text-[8px] text-slate-400 italic">
                                    Gerado por {user.name} em {new Date().toLocaleString('pt-BR')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NutritionalPlanning;
