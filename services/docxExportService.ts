import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Meal, MealItem } from '../types';

export const DocxExportService = {
    async generatePlanDocx(snapshot: any) {
        const { patient, clinic, professional, plan, clinicalSummary, adherence } = snapshot;

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Header - Clinic Name
                    new Paragraph({
                        text: clinic?.name || 'ControlClin',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        text: `Plano Alimentar - ${patient.name}`,
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),

                    // Patient Info
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Paciente: ", bold: true }),
                            new TextRun({ text: `${patient.name} (${patient.age} anos)` }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Objetivo: ", bold: true }),
                            new TextRun({ text: patient.objective }),
                        ],
                        spacing: { after: 400 },
                    }),

                    // Clinical Summary
                    ...(clinicalSummary ? [
                        new Paragraph({
                            text: "RESUMO CLÍNICO E ORIENTAÇÕES",
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 400, after: 200 },
                        }),
                        ...clinicalSummary.split('\n').map((line: string) =>
                            new Paragraph({
                                text: line,
                                spacing: { after: 120 },
                            })
                        ),
                    ] : []),

                    // Meals Title
                    new Paragraph({
                        text: "PLANO ALIMENTAR",
                        heading: HeadingLevel.HEADING_3,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 400 },
                    }),

                    // Meals
                    ...plan.meals.flatMap((meal: Meal) => {
                        if (meal.items.length === 0) return [];
                        return [
                            new Paragraph({
                                text: `${meal.name}${meal.time ? ` - ${meal.time}` : ''}`,
                                heading: HeadingLevel.HEADING_4,
                                shading: { fill: "F3F4F6", type: "clear", color: "auto" },
                                spacing: { before: 400, after: 200 },
                            }),
                            ...meal.items.map((item: MealItem) =>
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: "• ", bold: true }),
                                        new TextRun({ text: `${item.quantity} ${item.unit} `, bold: true }),
                                        new TextRun({ text: item.customName || item.name }),
                                    ],
                                    indent: { left: 720 },
                                    spacing: { after: 120 },
                                })
                            ),
                            // Substitutes if any
                            ...meal.items.flatMap((item: MealItem) => (item.substitutes || []).map(sub =>
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: "   OU ", bold: true, color: "059669" }),
                                        new TextRun({ text: `${sub.quantity} ${sub.unit} `, italics: true }),
                                        new TextRun({ text: sub.customName || sub.name, italics: true }),
                                    ],
                                    indent: { left: 1440 },
                                    spacing: { after: 120 },
                                })
                            ))
                        ];
                    }),

                    // Adherence Tips
                    ...(adherence ? [
                        new Paragraph({
                            text: "ESTRATÉGIAS PARA SUA ADESÃO",
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 600, after: 200 },
                        }),
                        ...adherence.tips.map((tip: any, idx: number) =>
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${idx + 1}. ${tip.category}: `, bold: true }),
                                    new TextRun({ text: tip.tip }),
                                    new TextRun({ text: `\nMotivo: ${tip.rationale}`, italics: true, size: 18 }),
                                ],
                                spacing: { after: 200 },
                            })
                        ),
                    ] : []),

                    // Professional Footer
                    new Paragraph({
                        text: `Responsável: ${professional?.name || ''}`,
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 1000 },
                    }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        const filename = `Plano_Alimentar_${patient.name.replace(/\s+/g, '_')}.docx`;
        saveAs(blob, filename);
    }
};
