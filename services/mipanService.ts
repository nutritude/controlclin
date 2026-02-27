import { MipanAssessment, Patient, AnthropometryRecord, Exam } from '../types';

export interface MipanQuestion {
    id: number;
    text: string;
    axis: 'A' | 'B' | 'C' | 'D';
    invert?: boolean;
}

export const MIPAN_QUESTIONS: MipanQuestion[] = [
    // EIXO A – Desregulação Alimentar (6 perguntas)
    { id: 1, text: "Você sente dificuldade em parar de comer após começar?", axis: 'A' },
    { id: 2, text: "Você come mesmo quando não sente fome física?", axis: 'A' },
    { id: 3, text: "Você utiliza comida para aliviar emoções negativas?", axis: 'A' },
    { id: 4, text: "Você alterna períodos de restrição rígida com exageros?", axis: 'A' },
    { id: 5, text: "Você sente culpa após comer certos alimentos?", axis: 'A' },
    { id: 6, text: "Você já sentiu perda de controle alimentar?", axis: 'A' },

    // EIXO B – Vulnerabilidade Emocional (5 perguntas)
    { id: 7, text: "Você tem se sentido desanimado(a) ou sem motivação?", axis: 'B' },
    { id: 8, text: "Você sente cansaço persistente mesmo após dormir?", axis: 'B' },
    { id: 9, text: "Você percebe irritabilidade frequente?", axis: 'B' },
    { id: 10, text: "Seu sono tem sido irregular ou não reparador?", axis: 'B' },
    { id: 11, text: "Você sente preocupação excessiva na maior parte dos dias?", axis: 'B' },

    // EIXO C – Estresse Crônico / Sobrecarga (5 perguntas)
    { id: 12, text: "Você sente sobrecarga constante no dia a dia?", axis: 'C' },
    { id: 13, text: "Você tem dificuldade de “desligar” da rotina de trabalho ou problemas?", axis: 'C' },
    { id: 14, text: "Você deixa de cuidar da alimentação por falta de tempo?", axis: 'C' },
    { id: 15, text: "Você sente esgotamento físico frequente?", axis: 'C' },
    { id: 16, text: "Você sente que não tem tempo suficiente para autocuidado?", axis: 'C' },

    // EIXO D – Capacidade de Adesão (4 perguntas)
    { id: 17, text: "Você costuma planejar ou organizar suas refeições?", axis: 'D' },
    { id: 18, text: "Você acredita que consegue seguir um plano alimentar?", axis: 'D' },
    { id: 19, text: "Seu ambiente doméstico favorece escolhas saudáveis?", axis: 'D' },
    { id: 20, text: "Você já abandonou planos alimentares anteriores rapidamente?", axis: 'D', invert: true }
];

export class MipanService {
    static calculate(patientId: string, answers: Record<number, number>): Partial<MipanAssessment> {
        const scores = {
            axisA: this.calcAxis(answers, 'A', 24),
            axisB: this.calcAxis(answers, 'B', 20),
            axisC: this.calcAxis(answers, 'C', 20),
            axisD: this.calcAxis(answers, 'D', 16) // Este é CAPACIDADE (0-100)
        };

        // Para o ICRN, o Eixo D deve ser transformado em RISCO (100 - Capacidade)
        const axisDRisk = 100 - scores.axisD;

        const icrn = (scores.axisA * 0.35) + (scores.axisB * 0.25) + (scores.axisC * 0.20) + (axisDRisk * 0.20);

        let classification: MipanAssessment['classification'] = "BAIXO";
        if (icrn > 75) classification = "ALTO";
        else if (icrn > 50) classification = "MODERADO";
        else if (icrn > 25) classification = "LEVE";

        return {
            patientId,
            date: new Date().toISOString(),
            answers,
            scores,
            icrn: Math.round(icrn),
            classification,
            isDraft: false
        };
    }

    private static calcAxis(answers: Record<number, number>, axis: string, max: number): number {
        const questions = MIPAN_QUESTIONS.filter(q => q.axis === axis);
        let sum = 0;
        questions.forEach(q => {
            let val = answers[q.id] || 0;
            if (q.invert) val = 4 - val;
            sum += val;
        });
        return Math.round((sum / max) * 100);
    }

    static generateInsights(assessment: Partial<MipanAssessment>, patient: Patient, lastAnthro?: AnthropometryRecord, exams?: Exam[]) {
        if (!assessment.scores) return null;

        const { axisA, axisB, axisC, axisD } = assessment.scores;
        const axisDRisk = 100 - axisD;
        const priorities: string[] = [];
        let recommendation = "";
        let alert = "";

        // 1. Cruzamentos de Eixos
        if (axisA > 70 && axisB > 70) {
            priorities.push("Perfil de descontrole emocional alimentar detectado");
        }
        if (axisC > 70 && axisB > 70) {
            priorities.push("Estresse com vulnerabilidade afetiva significativa");
        }

        // 2. Cruzamentos Clínicos
        if (axisA > 70 && lastAnthro && lastAnthro.bmi > 30) {
            priorities.push("Risco aumentado de compulsão alimentar associada à obesidade");
        }

        if (axisB > 70 && (patient.clinicalHistory?.symptoms?.toLowerCase().includes('fadiga') || patient.clinicalHistory?.habits?.toLowerCase().includes('cansaço'))) {
            priorities.push("Vulnerabilidade emocional associada a baixa energia");
        }

        if (axisC > 70 && (patient.clinicalHistory?.habits?.toLowerCase().includes('sono irregular') || patient.clinicalHistory?.symptoms?.toLowerCase().includes('insônia'))) {
            priorities.push("Risco metabólico por estresse crônico (HPA axis influence)");
        }

        const hasAbandonHistory = patient.clinicalHistory?.habits?.toLowerCase().includes('abandono') ||
            patient.clinicalHistory?.symptoms?.toLowerCase().includes('desistência');
        if (axisDRisk > 60 || (axisD < 40 && hasAbandonHistory)) {
            priorities.push("Alto risco de não adesão ao plano (Preditores de abandono)");
        }

        // Cruzamento com Exames (Exemplo: Glicemia)
        const hasHighGlucose = exams?.some(e => e.markers?.some(m => m.name.toLowerCase().includes('glicose') && m.interpretation === 'ALTO'));
        if (axisC > 70 && hasHighGlucose) {
            priorities.push("Estresse como fator agravante metabólico (Glicemia alterada)");
        }

        // Recomendações Estratégicas
        if (axisA > 70) {
            recommendation = "Recomenda-se plano alimentar com foco em saciedade e acompanhamento comportamental. Evitar restrições extremas.";
        } else if (axisC > 70) {
            recommendation = "Foco em estratégias de planejamento prático (refeições rápidas) e técnicas de higiene do sono.";
        } else {
            recommendation = "Manter foco na organização e reforço positivo dos hábitos atuais.";
        }

        // Alertas Comportamentais
        if (assessment.icrn && assessment.icrn > 75) {
            alert = "Perfil de Alto Risco Comportamental: Necessária abordagem multidisciplinar para sustentabilidade do plano.";
        } else if (axisB > 70) {
            alert = "Vulnerabilidade emocional elevada: Monitorar impacto na adesão nos próximos 15 dias.";
        } else {
            alert = "Padrão comportamental sugere estabilidade no momento.";
        }

        // Garantir no máximo 3 insights prioritários
        return {
            priorities: priorities.slice(0, 3),
            recommendation,
            alert
        };
    }
}
