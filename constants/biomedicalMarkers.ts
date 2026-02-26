
export interface MarkerReference {
    name: string;
    aliases: string[];
    unit: string;
    minDesejavel: number;
    maxDesejavel: number;
    tipo: 'BIOQUIMICO' | 'HORMONAL' | 'HEMATOLOGICO';
    interpretacao: {
        baixo: {
            risco: string;
            sugestao: string;
        };
        alto: {
            risco: string;
            sugestao: string;
        };
        normal: string;
    };
}

export const BIOMEDICAL_MARKERS: Record<string, MarkerReference> = {
    GLICOSE: {
        name: "Glicose em Jejum",
        aliases: ["Glicemia", "Glicose", "Blood Sugar"],
        unit: "mg/dL",
        minDesejavel: 70,
        maxDesejavel: 99,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Hipoglicemia: Risco de tonturas, desmaios e fadiga extrema.",
                sugestao: "Avaliar consumo de carboidratos complexos e fracionamento das refeições."
            },
            alto: {
                risco: "Hiperglicemia/Diabetes: Risco de complicações cardiovasculares e danos renais.",
                sugestao: "Restrição de açúcares simples, aumento de fibras e avaliação médica para resistência insulínica."
            },
            normal: "Níveis saudáveis de açúcar no sangue."
        }
    },
    HEMOGLOBINA_GLICADA: {
        name: "Hemoglobina Glicada (HbA1c)",
        aliases: ["HbA1c", "Glicada"],
        unit: "%",
        minDesejavel: 4.0,
        maxDesejavel: 5.6,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Hipoglicemia crônica ou anemias específicas.",
                sugestao: "Investigar causas de hipoglicemia recorrente."
            },
            alto: {
                risco: "Prediabetes (5.7-6.4) ou Diabetes (>6.5). Risco inflamatório sistêmico.",
                sugestao: "Controle rigoroso de carga glicêmica e atividade física regular."
            },
            normal: "Controle glicêmico dos últimos 3 meses está adequado."
        }
    },
    COLESTEROL_TOTAL: {
        name: "Colesterol Total",
        aliases: ["Colest. Total", "CHOL"],
        unit: "mg/dL",
        minDesejavel: 120,
        maxDesejavel: 190,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Hipocolesterolemia: Pode afetar produção de hormônios esteroides e vit D.",
                sugestao: "Avaliar absorção intestinal e aporte de gorduras saudáveis."
            },
            alto: {
                risco: "Dislipidemia: Aumento do risco de placas de ateroma e infarto.",
                sugestao: "Substituir gorduras saturadas por insaturadas e aumentar fitoesterois."
            },
            normal: "Perfil lipídico em equilíbrio."
        }
    },
    HDL: {
        name: "HDL (Bom Colesterol)",
        aliases: ["HDL-c"],
        unit: "mg/dL",
        minDesejavel: 40,
        maxDesejavel: 100,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Baixa proteção cardiovascular.",
                sugestao: "Aumentar atividade física aeróbica e consumo de Ômega-3."
            },
            alto: {
                risco: "Excelente proteção cardiovascular.",
                sugestao: "Manter hábitos saudáveis."
            },
            normal: "Proteção cardiovascular adequada."
        }
    },
    LDL: {
        name: "LDL (Mau Colesterol)",
        aliases: ["LDL-c"],
        unit: "mg/dL",
        minDesejavel: 0,
        maxDesejavel: 130,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Baixo risco aterogênico.",
                sugestao: "Manter dieta equilibrada."
            },
            alto: {
                risco: "Alto risco cardiovascular e inflamação vascular.",
                sugestao: "Redução de gorduras trans e saturadas, avaliação de uso de estatinas."
            },
            normal: "Níveis seguros para a saúde vascular."
        }
    },
    TRIGLICERIDEOS: {
        name: "Triglicerídeos",
        aliases: ["Triglicérides", "TRIG"],
        unit: "mg/dL",
        minDesejavel: 50,
        maxDesejavel: 150,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Desnutrição ou hipertireoidismo.",
                sugestao: "Investigar balanço energético."
            },
            alto: {
                risco: "Risco de pancreatite e síndrome metabólica.",
                sugestao: "Reduzir consumo de álcool e carboidratos refinados."
            },
            normal: "Armazenamento de energia em níveis ideais."
        }
    },
    CREATININA: {
        name: "Creatinina",
        aliases: ["CREA", "Creatine"],
        unit: "mg/dL",
        minDesejavel: 0.6,
        maxDesejavel: 1.2,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Baixa massa muscular ou desidratação severa.",
                sugestao: "Avaliar ingestão proteica e saúde muscular."
            },
            alto: {
                risco: "Insuficiência renal ou sobrecarga renal.",
                sugestao: "Hidratação adequada e acompanhamento nefrológico."
            },
            normal: "Função renal preservada."
        }
    },
    VITAMINA_D: {
        name: "Vitamina D (25-OH)",
        aliases: ["Vit D", "25-Hidroxivitamina D"],
        unit: "ng/mL",
        minDesejavel: 30,
        maxDesejavel: 100,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: {
                risco: "Risco de osteoporose, baixa imunidade e depressão.",
                sugestao: "Exposição solar controlada e suplementação de Colecalciferol."
            },
            alto: {
                risco: "Toxicidade (raro): Hipercalcemia.",
                sugestao: "Suspender suplementação e monitorar cálcio."
            },
            normal: "Níveis adequados para saúde óssea e imune."
        }
    },
    FERRITINA: {
        name: "Ferritina",
        aliases: ["Ferro Estoque"],
        unit: "ng/mL",
        minDesejavel: 30,
        maxDesejavel: 400,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: {
                risco: "Anemia ferropriva: Fadiga, queda de cabelo e palidez.",
                sugestao: "Aumentar consumo de ferro heme e vitamina C."
            },
            alto: {
                risco: "Inflamação sistêmica aguda ou hemocromatose.",
                sugestao: "Investigar focos inflamatórios ou sobrecarga de ferro."
            },
            normal: "Estoques de ferro adequados."
        }
    },
    TSH: {
        name: "TSH",
        aliases: ["Hormônio Tireoestimulante"],
        unit: "uUI/mL",
        minDesejavel: 0.4,
        maxDesejavel: 4.5,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: {
                risco: "Hipertireoidismo: Agitação, insônia, perda de peso.",
                sugestao: "Avaliação endocrinológica."
            },
            alto: {
                risco: "Hipotireoidismo: Cansaço, ganho de peso, frio excessivo.",
                sugestao: "Investigar tireoidite de Hashimoto e aporte de Iodo/Selênio."
            },
            normal: "Função tireoidiana equilibrada."
        }
    }
};
