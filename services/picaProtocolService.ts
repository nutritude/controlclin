
import { Anthropometry } from '../types';

export interface PicaResult {
    classId: number;
    diagnosis: string;
    synthesis: string;
    conduct: string;
    alerts: string[];
}

export const PicaProtocolService = {
    calculate: (anthro: Anthropometry, gender: string, age: number): PicaResult => {
        const bmi = anthro.bmi || 0;
        // Prioriza o percentual de gordura calculado (dobras), mas aceita Bioimpedância como fallback
        const bodyFatPct = anthro.bodyFatPercentage || anthro.bioimpedanceFatPercentage || 0;
        const circWaist = anthro.circWaist || 0;
        const heightM = anthro.height || 0;
        const whtr = (circWaist && heightM) ? (circWaist / (heightM * 100)) : 0;
        const grav = anthro.clinicalGravity || 'G0';
        const func = anthro.functionalStatus || 'Preservado';

        let classId = 1;
        let diagnosis = '';
        let synthesis = '';
        let conduct = '';
        let alerts: string[] = [];

        // 1. Auxiliares de Classificação
        const isFatHigh = gender === 'Masculino'
            ? (bodyFatPct >= 25)
            : (bodyFatPct >= 35);

        const isFatObese = gender === 'Masculino'
            ? (bodyFatPct >= 30)
            : (bodyFatPct >= 42);

        const isWaistHigh = gender === 'Masculino'
            ? (circWaist > 102)
            : (circWaist > 88);

        const isWhtrHigh = whtr >= 0.50;
        const isWhtrCritical = whtr >= 0.60;

        const isMMReduced = func === 'Reduzido' || func === 'Limítrofe';

        // 2. Matriz de Decisão
        if (bmi >= 18.5 && bmi < 25 && !isFatHigh && !isWaistHigh && !isMMReduced && grav === 'G0') {
            classId = 1;
            diagnosis = "Eutrofia Real";
            synthesis = "Perfil compatível com manutenção. Composição corporal sem sinais relevantes de excesso adiposo.";
            conduct = "Manutenção, educação alimentar, treino resistido e reavaliação periódica.";
        }
        else if (bmi < 25 && (isFatHigh || isFatObese)) {
            classId = 2;
            diagnosis = "Adiposidade Oculta";
            synthesis = "Paciente não obeso pelo IMC, mas com excesso de gordura corporal.";
            conduct = "Recomposição corporal, déficit calórico leve a moderado, aporte proteico adequado e treino resistido obrigatório.";
        }
        else if (bmi >= 25 && bmi < 30 && !isFatHigh && !isWaistHigh && !isMMReduced && (grav === 'G0' || grav === 'G1')) {
            classId = 3;
            diagnosis = "Sobrepeso sem grande repercussão adiposa";
            synthesis = "Excesso de peso sem confirmação forte de excesso adiposo importante.";
            conduct = "Foco em recomposição corporal, não tratar automaticamente como obesidade clínica, treino resistido e monitorar tendência.";
        }
        else if (bmi >= 25 && bmi < 30 && (isFatHigh || isFatObese)) {
            classId = 4;
            diagnosis = "Sobrepeso Adiposo";
            synthesis = "Excesso adiposo já estabelecido, ainda que o IMC não esteja na faixa de obesidade.";
            conduct = "Emagrecimento estruturado com preservação muscular, déficit calórico planejado e treino resistido 2-4x/semana.";
        }
        else if (bmi >= 30 && !isMMReduced && grav !== 'G3' && !isWaistHigh) {
            classId = 5;
            diagnosis = "Obesidade com massa magra preservada";
            synthesis = "Quadro típico de excesso adiposo com preservação razoável de reserva magra.";
            conduct = "Prioridade: Reduzir gordura corporal (meta inicial 5-10%), treino resistido obrigatório e déficit calórico moderado.";
        }
        else if (bmi >= 30 && (isWaistHigh || isWhtrHigh) && (grav === 'G1' || grav === 'G2')) {
            classId = 6;
            diagnosis = "Obesidade com adiposidade central e risco metabólico";
            synthesis = "Maior risco cardiometabólico detectado devido à distribuição de gordura.";
            conduct = "Emagrecimento estruturado prioritário, rastreio laboratorial frequente e atenção a comorbidades (PA, Glicemia, Lipídios).";
        }
        else if (bmi >= 35 || (bmi >= 30 && grav === 'G3') || (isFatObese && isWaistHigh && (grav === 'G2' || grav === 'G3'))) {
            classId = 7;
            diagnosis = "Obesidade de maior gravidade clínica";
            synthesis = "Excesso adiposo com repercussão clínica claro ou IMC muito elevado.";
            conduct = "Plano intensivo, seguimento curto, metas além do peso e abordagem interdisciplinar.";
        }
        else if (isMMReduced && (bmi >= 25 || isFatHigh)) {
            classId = 8;
            diagnosis = "Obesidade com baixa reserva magra / risco funcional";
            synthesis = "Maior risco de obesidade sarcopênica ou perda funcional.";
            conduct = "Evitar restrição agressiva, prioridade em preservar função e força, proteína bem distribuída e treino resistido progressivo.";
        } else {
            // Fallback para situações limítrofes não mapeadas explicitamente
            classId = 5;
            diagnosis = "Obesidade / Sobrepeso em Avaliação";
            synthesis = "Excesso ponderal que requer acompanhamento da evolução da composição corporal.";
            conduct = "Recomposição corporal e monitoramento de indicadores antropométricos.";
        }

        // 3. Regras de Alerta (Saídas Adicionais)
        if (isWhtrCritical) {
            alerts.push("ALTO RISCO CENTRAL: Relação Cintura/Estatura ≥ 0.60. Risco cardiometabólico elevado.");
        }
        if (isMMReduced && isFatHigh) {
            alerts.push("RISCO FUNCIONAL: Baixa reserva magra detectada. Evitar estratégias agressivas de perda de peso.");
        }
        if (grav === 'G3' || bmi >= 35) {
            alerts.push("MANEJO INTENSIVO: Perfil de maior gravidade clínica. Exige acompanhamento próximo e interdisciplinar.");
        }

        return { classId, diagnosis, synthesis, conduct, alerts };
    }
};
