
import { Exam, ExamMarker, User } from '../types';
import { BIOMEDICAL_MARKERS } from '../constants/biomedicalMarkers';

export const LaboratService = {
    /**
     * Processa uma lista de marcadores brutos e aplica a inteligência biomédica
     */
    processMarkers: (rawMarkers: Array<{ name: string; value: number | string; unit?: string }>): ExamMarker[] => {
        return rawMarkers.map(rm => {
            const nameUpper = rm.name.toUpperCase();
            const meta = Object.values(BIOMEDICAL_MARKERS).find(m =>
                m.name.toUpperCase() === nameUpper ||
                m.aliases.some(a => a.toUpperCase() === nameUpper)
            );

            const parsedValue = typeof rm.value === 'number'
                ? rm.value
                : parseFloat(String(rm.value).replace(',', '.'));

            const value = isNaN(parsedValue) ? 0 : parsedValue;

            const marker: ExamMarker = {
                id: Math.random().toString(36).substr(2, 9),
                name: meta?.name || rm.name,
                value: value,
                unit: rm.unit || meta?.unit || 'un',
                reference: {
                    min: meta?.minDesejavel || 0,
                    max: meta?.maxDesejavel || 0,
                    label: meta ? `${meta.minDesejavel} - ${meta.maxDesejavel} ${meta.unit}` : 'N/A'
                },
                interpretation: 'NORMAL'
            };

            if (meta) {
                // Checar limites críticos primeiro
                const isCritLow = meta.minCritico !== undefined && value <= meta.minCritico;
                const isCritHigh = meta.maxCritico !== undefined && value >= meta.maxCritico;

                if (isCritLow || isCritHigh) {
                    marker.interpretation = 'CRITICO';
                    marker.biomedicalData = isCritLow ? meta.interpretacao.baixo : meta.interpretacao.alto;
                } else if (value < meta.minDesejavel) {
                    marker.interpretation = 'BAIXO';
                    marker.biomedicalData = meta.interpretacao.baixo;
                } else if (value > meta.maxDesejavel) {
                    marker.interpretation = 'ALTO';
                    marker.biomedicalData = meta.interpretacao.alto;
                } else {
                    marker.interpretation = 'NORMAL';
                    marker.biomedicalData = { risco: 'Desejável', sugestao: meta.interpretacao.normal };
                }
            }

            return marker;
        });
    },

    /**
     * Calcula o "Health Score" laboratorial com pesos para criticidade
     */
    calculateExamScore: (markers: ExamMarker[]): number => {
        if (markers.length === 0) return 0;

        let penaltyPoints = 0;
        markers.forEach(m => {
            if (m.interpretation === 'CRITICO') penaltyPoints += 40;
            else if (m.interpretation !== 'NORMAL') penaltyPoints += 15;
        });

        // O score não pode ser negativo
        return Math.max(0, 100 - (penaltyPoints / markers.length) * 10);
    },

    getChartData: (marker: ExamMarker) => {
        return [
            { name: 'Mínimo', valor: marker.reference.min, type: 'ref' },
            { name: 'Seu Resultado', valor: marker.value, type: 'result', status: marker.interpretation },
            { name: 'Máximo', valor: marker.reference.max, type: 'ref' }
        ];
    }
};
