import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Meal, MealItem } from '../types';
import { ShoppingListService } from './food/shoppingList';

export const DocxExportService = {
    async generatePlanDocx(snapshot: any) {
        const { patient, clinic, professional, plan, clinicalSummary, adherence } = snapshot;

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children: [
                    // 1. HEADER (Clinic & Patient Info)
                    new Paragraph({
                        text: clinic?.name || 'ControlClin',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Plano Alimentar Individualizado", bold: true, size: 28 }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "Paciente: ", bold: true }),
                            new TextRun({ text: `${patient.name} (${patient.age || ''} anos)` }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Objetivo: ", bold: true }),
                            new TextRun({ text: patient.objective || 'Manutenção da Saúde' }),
                        ],
                        spacing: { after: 600 },
                    }),

                    // 2. CLINICAL SUMMARY (IA)
                    ...(clinicalSummary ? [
                        new Paragraph({
                            text: "RESUMO CLÍNICO E ORIENTAÇÕES",
                            heading: HeadingLevel.HEADING_3,
                            shading: { fill: "F0FDF4", type: "clear", color: "auto" },
                            spacing: { before: 400, after: 300 },
                        }),
                        ...clinicalSummary.split('\n').map((line: string) =>
                            new Paragraph({
                                text: line,
                                spacing: { after: 120 },
                                indent: { left: 240 },
                            })
                        ),
                    ] : []),

                    // 3. MEALS (Plano Alimentar)
                    new Paragraph({
                        text: "PLANO ALIMENTAR",
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 800, after: 600 },
                    }),

                    ...plan.meals.flatMap((meal: Meal) => {
                        if (meal.items.length === 0) return [];

                        const formatQuantity = (item: MealItem) => {
                            let displayUnit = item.unit;
                            const lowerName = (item.customName || item.name).toLowerCase();
                            if (displayUnit === 'g') {
                                const liquids = ['vinho', 'suco', 'água', 'café', 'cafe', 'chá', 'cha', 'bebida', 'leite', 'refrigerante', 'cerveja', 'hidratação'];
                                if (liquids.some(l => lowerName.includes(l))) displayUnit = 'ml';
                            }
                            const countableUnits = ['fatia', 'fatias', 'unidade', 'unidades', 'copo', 'copos', 'pedaço', 'pedaços', 'porção', 'porções', 'colher', 'colheres', 'xícara', 'xícaras', 'concha', 'conchas', 'filé', 'filés', 'ovo', 'ovos'];
                            const isCountable = countableUnits.some(cu => displayUnit.toLowerCase().includes(cu));
                            if (item.quantity === 1 && !isCountable) return displayUnit;
                            return `${item.quantity} ${displayUnit}`;
                        };

                        return [
                            new Paragraph({
                                text: `${meal.name.toUpperCase()}${meal.time ? ` (${meal.time})` : ''}`,
                                heading: HeadingLevel.HEADING_3,
                                shading: { fill: "F8FAFC", type: "clear", color: "auto" },
                                spacing: { before: 500, after: 300 },
                                border: { bottom: { color: "CBD5E1", size: 6, space: 1, style: BorderStyle.SINGLE } }
                            }),
                            ...meal.items.flatMap((item: MealItem) => [
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: "• ", bold: true, color: "475569", font: "Calibri" }),
                                        new TextRun({ text: `${formatQuantity(item)} `, bold: true, font: "Calibri" }),
                                        new TextRun({ text: item.customName || item.name, font: "Calibri" }),
                                    ],
                                    indent: { left: 480 },
                                    spacing: { before: 100, after: 100 },
                                }),
                                ...(item.substitutes || []).map(sub =>
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "   OU ", bold: true, color: "059669", size: 16, font: "Calibri" }),
                                            new TextRun({ text: `${formatQuantity(sub)} `, italics: true, color: "475569", font: "Calibri" }),
                                            new TextRun({ text: sub.customName || sub.name, italics: true, color: "475569", font: "Calibri" }),
                                        ],
                                        indent: { left: 960 },
                                        spacing: { after: 80 },
                                    })
                                )
                            ]),
                            ...(meal.notes ? [
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: "📝 Observação: ", bold: true, color: "0EA5E9", size: 18 }),
                                        new TextRun({ text: meal.notes, color: "334155", size: 18 }),
                                    ],
                                    spacing: { before: 100, after: 300 },
                                    indent: { left: 480 },
                                    shading: { fill: "F8FAFC", type: "clear", color: "auto" },
                                })
                            ] : [])
                        ];
                    }),

                    // 4. ADHERENCE TIPS (IA)
                    ...(adherence ? [
                        new Paragraph({
                            text: "ESTRATÉGIAS PARA SUA ADESÃO",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 1000, after: 400 },
                        }),
                        ...adherence.tips.flatMap((tip: any, idx: number) => [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${idx + 1}. ${tip.category}: `, bold: true, color: "059669" }),
                                    new TextRun({ text: tip.tip, bold: true }),
                                ],
                                spacing: { before: 200, after: 100 },
                                indent: { left: 240 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: tip.rationale,
                                        italics: true,
                                        size: 18,
                                        color: "64748B",
                                    }),
                                ],
                                spacing: { after: 200 },
                                indent: { left: 480 },
                            })
                        ]),
                    ] : []),

                    // 5. SHOPPING LIST
                    new Paragraph({
                        text: "LISTA DE COMPRAS SEMANAL",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 1000, after: 400 },
                    }),
                    ...Object.entries(ShoppingListService.generate(plan.meals)).flatMap(([category, items]: [string, any[]]) => {
                        if (items.length === 0) return [];
                        return [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: category.toUpperCase(),
                                        color: "059669",
                                        bold: true,
                                    }),
                                ],
                                spacing: { before: 300, after: 150 },
                            }),
                            ...items.map(item => new Paragraph({
                                children: [
                                    new TextRun({ text: "☐ ", color: "CBD5E1" }),
                                    new TextRun({ text: `${item.name}: `, color: "334155" }),
                                    new TextRun({ text: `${(item.totalGrams * 7).toFixed(0)}g`, bold: true }),
                                ],
                                indent: { left: 480 },
                                spacing: { after: 100 },
                            }))
                        ];
                    }),

                    // 6. FOOTER
                    new Paragraph({
                        text: `________________________________________`,
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 1200 },
                    }),
                    new Paragraph({
                        text: `Responsável: ${professional?.name || ''}`,
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
                                size: 16,
                                color: "94A3B8",
                            }),
                        ],
                        alignment: AlignmentType.RIGHT,
                    }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        const filename = `Plano_Alimentar_${patient.name.replace(/\s+/g, '_')}.docx`;
        saveAs(blob, filename);
    }
};
