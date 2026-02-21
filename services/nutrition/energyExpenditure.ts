import { NutritionalPlan } from '../../types';

export interface AmputationLimb {
    name: string;
    percent: number;
}

export const AMPUTATION_MEMBERS: AmputationLimb[] = [
    { name: 'Mão', percent: 0.8 },
    { name: 'Antebraço', percent: 2.3 },
    { name: 'Braço (Total)', percent: 6.6 },
    { name: 'Braço (Parte Superior)', percent: 3.5 },
    { name: 'Pé', percent: 1.8 },
    { name: 'Perna (Abaixo do Joelho)', percent: 5.3 },
    { name: 'Coxa', percent: 11.6 },
    { name: 'Perna (Total)', percent: 18.7 },
];

export interface CalculationInput {
    weight: number;
    height: number; // em cm
    age: number;
    gender: 'Masculino' | 'Feminino';
    formula: string;
    activityFactor: number;
    injuryFactor: number;
    amputations: Array<{ limb: string; percent: number }>;
    caloricGoalAdjustment: number;
    patientProfile?: string;
    pregnancyTrimestre?: 1 | 2 | 3;
}

export interface CalculationOutput {
    tmb: number;
    get: number;
    kcalTarget: number;
    weightAdjusted: number;
    calculationMemory: string;
    safetyRange: { min: number; max: number };
}

export class EnergyExpenditureService {
    static calculateAdjustedWeight(weight: number, amputations: Array<{ percent: number }>): number {
        const totalPercent = amputations.reduce((sum, amp) => sum + amp.percent, 0);
        if (totalPercent >= 100) return weight;
        return weight / (1 - totalPercent / 100);
    }

    static calculateObeseAdjustedWeight(actualWeight: number, heightCm: number, gender: string): number {
        const idealWeight = 22 * Math.pow(heightCm / 100, 2);
        if (actualWeight <= idealWeight) return actualWeight;
        return (actualWeight - idealWeight) * 0.25 + idealWeight;
    }

    static calculate(input: CalculationInput): CalculationOutput {
        const { weight, height, age, gender, formula, activityFactor, injuryFactor, amputations, caloricGoalAdjustment, patientProfile, pregnancyTrimestre } = input;
        const isMale = gender === 'Masculino';

        // 1. Ajuste de Peso
        let weightForCalc = this.calculateAdjustedWeight(weight, amputations);
        const weightAmputeeAdjusted = weightForCalc;

        // Ajuste específico para Obesos em certas fórmulas
        if (patientProfile === 'OBESO' || formula === 'HARRIS_OBESO') {
            weightForCalc = this.calculateObeseAdjustedWeight(weightForCalc, height, gender);
        }

        let tmb = 0;
        let memory = '';

        // 2. Execução das Fórmulas
        switch (formula) {
            case 'MIFFLIN':
                tmb = (10 * weightForCalc) + (6.25 * height) - (5 * age) + (isMale ? 5 : -161);
                memory = `Mifflin-St Jeor: (10 * ${weightForCalc.toFixed(1)}) + (6.25 * ${height}) - (5 * ${age}) + ${isMale ? 5 : -161}`;
                break;

            case 'HARRIS':
            case 'HARRIS_OBESO':
                if (isMale) {
                    tmb = 88.362 + (13.397 * weightForCalc) + (4.799 * height) - (5.677 * age);
                    memory = `Harris-Benedict (M): 88.362 + (13.397 * ${weightForCalc.toFixed(1)}) + (4.799 * ${height}) - (5.677 * ${age})`;
                } else {
                    tmb = 447.593 + (9.247 * weightForCalc) + (3.098 * height) - (4.330 * age);
                    memory = `Harris-Benedict (F): 447.593 + (9.247 * ${weightForCalc.toFixed(1)}) + (3.098 * ${height}) - (4.330 * ${age})`;
                }
                break;

            case 'FAO_WHO':
            case 'OMS_SCHOFIELD':
            case 'SCHOFIELD':
                if (isMale) {
                    if (age < 3) tmb = (60.9 * weightForCalc) - 54;
                    else if (age < 10) tmb = (22.7 * weightForCalc) + 495;
                    else if (age < 18) tmb = (17.5 * weightForCalc) + 651;
                    else if (age < 30) tmb = (15.3 * weightForCalc) + 679;
                    else if (age < 60) tmb = (11.6 * weightForCalc) + 879;
                    else tmb = (13.5 * weightForCalc) + 487;
                } else {
                    if (age < 3) tmb = (61.0 * weightForCalc) - 51;
                    else if (age < 10) tmb = (22.5 * weightForCalc) + 499;
                    else if (age < 18) tmb = (12.2 * weightForCalc) + 746;
                    else if (age < 30) tmb = (14.7 * weightForCalc) + 496;
                    else if (age < 60) tmb = (8.7 * weightForCalc) + 829;
                    else tmb = (10.5 * weightForCalc) + 596;
                }
                memory = `Schofield/FAO/WHO: Equação para ${gender}, ${age} anos`;
                break;

            case 'HENRY_OXFORD':
                if (isMale) {
                    if (age >= 18 && age < 30) tmb = (14.4 * weightForCalc) + (313 * (height / 100)) + 113;
                    else if (age >= 30 && age < 60) tmb = (11.4 * weightForCalc) + (169 * (height / 100)) + 850;
                    else tmb = (11.4 * weightForCalc) + (245 * (height / 100)) + 587;
                } else {
                    if (age >= 18 && age < 30) tmb = (10.4 * weightForCalc) + (615 * (height / 100)) - 282;
                    else if (age >= 30 && age < 60) tmb = (8.18 * weightForCalc) + (502 * (height / 100)) + 290;
                    else tmb = (8.52 * weightForCalc) + (421 * (height / 100)) + 307;
                }
                memory = `Henry & Oxford: Equação baseada em Peso e Estatura (${gender})`;
                break;

            case 'LIPSCHITZ':
                // Lipschitz para Idosos (Ajustado por IMC se possível, aqui simplificado por kcal/kg)
                const imc = weight / Math.pow(height / 100, 2);
                let factor = 25;
                if (imc < 22) factor = 30; // Desnutrido
                else if (imc > 27) factor = 22; // Sobrepeso
                tmb = weightForCalc * factor;
                memory = `Lipschitz (Idoso): ${weightForCalc.toFixed(1)}kg * ${factor} kcal/kg (Base IMC: ${imc.toFixed(1)})`;
                break;

            case 'DIRECT_KCAL_KG':
                let directFactor = 25;
                if (patientProfile === 'ADULTO_EUTROFICO') directFactor = 30;
                else if (patientProfile === 'ADULTO_SOBREPESO') directFactor = 25;
                else if (patientProfile === 'OBESO') directFactor = 20;
                tmb = weightForCalc * directFactor;
                memory = `VET Direto (kcal/kg): ${weightForCalc.toFixed(1)}kg * ${directFactor} kcal/kg (${patientProfile})`;
                break;

            case 'IOM_GESTANTE':
                // IOM 2009: TMB baseada em peso pré-gestacional ou atual? 
                // Usaremos Harris como base + adicional IOM
                const baseTmb = isMale ?
                    88.362 + (13.397 * weightForCalc) + (4.799 * height) - (5.677 * age) :
                    447.593 + (9.247 * weightForCalc) + (3.098 * height) - (4.330 * age);

                let adicional = 0;
                if (pregnancyTrimestre === 2) adicional = 340;
                else if (pregnancyTrimestre === 3) adicional = 452;

                tmb = baseTmb + adicional;
                memory = `IOM Gestante: Harris base (${baseTmb.toFixed(0)}) + Adicional ${pregnancyTrimestre}º tri (+${adicional} kcal)`;
                break;

            default:
                tmb = weight * 25;
                memory = `Manual/Genérico: ${weight} * 25 kcal/kg`;
        }

        // 3. GET e Ajuste Final
        const get = tmb * activityFactor * (injuryFactor || 1);
        memory += ` | GET = TMB * FA(${activityFactor})${injuryFactor ? ` * FI(${injuryFactor})` : ''}`;

        const adjustmentFactor = 1 + (caloricGoalAdjustment / 100);
        const kcalTarget = Math.round(get * adjustmentFactor);
        if (caloricGoalAdjustment !== 0) {
            memory += ` | Meta: GET ${caloricGoalAdjustment > 0 ? '+' : ''}${caloricGoalAdjustment}% = ${kcalTarget} kcal`;
        }

        return {
            tmb: Math.round(tmb),
            get: Math.round(get),
            kcalTarget,
            weightAdjusted: Number(weightAmputeeAdjusted.toFixed(1)),
            calculationMemory: memory,
            safetyRange: {
                min: Math.round(get * 0.9),
                max: Math.round(get * 1.1)
            }
        };
    }
}
