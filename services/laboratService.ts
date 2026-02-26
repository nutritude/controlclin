
import { Exam, ExamMarker, User } from '../types';
import { BIOMEDICAL_MARKERS } from '../constants/biomedicalMarkers';

export const LaboratService = {
    /**
     * Processa uma lista de marcadores brutos e aplica a inteligência biomédica
     */
    processMarkers: (rawMarkers: Array<{ name: string; value: number | string; unit?: string }>): ExamMarker[] => {
        return rawMarkers.map(rm => {
            // Tenta encontrar o marcador na base pelo nome ou apelido
            const nameUpper = rm.name.toUpperCase();
            const meta = Object.values(BIOMEDICAL_MARKERS).find(m =>
                m.name.toUpperCase() === nameUpper ||
                m.aliases.some(a => a.toUpperCase() === nameUpper)
            );

            // Garantir que o valor é numérico
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
                if (value < meta.minDesejavel) {
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
     * Gera dados para um gráfico comparativo (Encontrado vs Referência)
     */
    getChartData: (marker: ExamMarker) => {
        return [
            { name: 'Mínimo', valor: marker.reference.min, type: 'ref' },
            { name: 'Seu Resultado', valor: marker.value, type: 'result', status: marker.interpretation },
            { name: 'Máximo', valor: marker.reference.max, type: 'ref' }
        ];
    },

    /**
     * Calcula o "Health Score" laboratorial simplificado
     */
    calculateExamScore: (markers: ExamMarker[]): number => {
        if (markers.length === 0) return 0;
        const altered = markers.filter(m => m.interpretation !== 'NORMAL').length;
        return Math.max(0, 100 - (altered * (100 / markers.length)));
    }
};
