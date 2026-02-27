import { Prescription, PrescriptionItem, PrescriptionTiming } from '../types';

export class PrescriptionService {
    static generateItemText(item: PrescriptionItem): string {
        const formText = this.formatForm(item.form);
        const frequencyText = this.formatFrequency(item.frequency, item.frequencyValue);
        const timingText = item.timings.map(t => this.formatTiming(t)).filter(Boolean).join(', ');
        const durationText = item.durationDays ? `, por ${item.durationDays} dias` : '';
        const instructionsText = item.instructions ? `\nObs: ${item.instructions}` : '';

        return `${item.name} (${formText}) — ${item.dose}\nTomar ${frequencyText}${timingText ? ', ' + timingText : ''}${durationText}.${instructionsText}`;
    }

    private static formatForm(form: string): string {
        const forms: Record<string, string> = {
            'CAPSULA': 'cápsula',
            'COMPRIMIDO': 'comprimido',
            'SACHE': 'sachê',
            'GOTAS': 'gotas',
            'PO': 'pó',
            'LIQUIDO': 'líquido',
            'SPRAY': 'spray',
            'OUTRO': 'unidade'
        };
        return forms[form] || form.toLowerCase();
    }

    static formatFrequency(freq: string, value?: number): string {
        switch (freq) {
            case '1_VEZ_AO_DIA': return '1 vez ao dia';
            case '2_VEZES_AO_DIA': return '2 vezes ao dia';
            case '3_VEZES_AO_DIA': return '3 vezes ao dia';
            case '4_VEZES_AO_DIA': return '4 vezes ao dia';
            case 'CADA_X_HORAS': return `a cada ${value || '?'} horas`;
            case 'X_VEZES_POR_SEMANA': return `${value || '?'} vezes por semana`;
            case 'SOS': return 'se necessário (SOS)';
            default: return freq;
        }
    }

    static formatTiming(timing: PrescriptionTiming): string {
        switch (timing.type) {
            case 'ANTES_DA_REFEICAO': {
                const mins = timing.minutes ?? 30;
                return `${mins} minutos antes do ${this.formatMeal(timing.meal)}`;
            }
            case 'APOS_DA_REFEICAO': {
                const mins = timing.minutes ?? 0;
                if (mins === 0) return `imediatamente após o ${this.formatMeal(timing.meal)}`;
                return `${mins} minutos após o ${this.formatMeal(timing.meal)}`;
            }
            case 'AO_ACORDAR':
                return 'ao acordar';
            case 'AO_DEITAR':
                return 'ao deitar';
            case 'EM_JEJUM':
                return 'em jejum';
            case 'HORARIO_FIXO':
                return `às ${timing.time || '00:00'}`;
            default:
                return '';
        }
    }

    private static formatMeal(meal?: string): string {
        const meals: Record<string, string> = {
            'CAFE': 'café da manhã',
            'ALMOCO': 'almoço',
            'LANCHE': 'lanche',
            'JANTAR': 'jantar',
            'CEIA': 'ceia'
        };
        return meal ? (meals[meal] || meal.toLowerCase()) : 'refeição';
    }

    static generateFullPrescriptionText(prescription: Prescription, patientName: string): string {
        const lines = [
            '═══════════════════════════════════',
            'PRESCRIÇÃO CLÍNICA',
            '═══════════════════════════════════',
            '',
            `Paciente: ${patientName}`,
            `Data: ${new Date(prescription.date).toLocaleDateString('pt-BR')}`,
            `Profissional: ${prescription.authorName}`,
            '',
            '───────────────────────────────────',
            '',
        ];

        prescription.items.forEach((item, idx) => {
            lines.push(`${idx + 1}. ${this.generateItemText(item)}`);
            lines.push('');
        });

        if (prescription.observations) {
            lines.push('───────────────────────────────────');
            lines.push('');
            lines.push('Observações:');
            lines.push(prescription.observations);
        }

        lines.push('');
        lines.push('═══════════════════════════════════');

        return lines.join('\n');
    }
}
