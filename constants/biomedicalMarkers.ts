
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
    // --- METABOLISMO GLICÊMICO ---
    GLICOSE: {
        name: "Glicose em Jejum",
        aliases: ["Glicemia", "Glicose", "Blood Sugar"],
        unit: "mg/dL",
        minDesejavel: 70,
        maxDesejavel: 99,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipoglicemia: Risco de tonturas, desmaios e fadiga.", sugestao: "Avaliar consumo de carboidratos complexos." },
            alto: { risco: "Hiperglicemia/Diabetes: Risco cardiovascular e renal.", sugestao: "Restrição de açúcares, aumento de fibras e proteínas." },
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
            baixo: { risco: "Hipoglicemia crônica ou anemias.", sugestao: "Investigar causas de glicemia baixa." },
            alto: { risco: "Prediabetes ou Diabetes. Glicação de proteínas alta.", sugestao: "Controle de carga glicêmica e exercícios." },
            normal: "Controle glicêmico dos últimos 3 meses adequado."
        }
    },
    INSULINA: {
        name: "Insulina em Jejum",
        aliases: ["Insulina", "IRI"],
        unit: "uIU/mL",
        minDesejavel: 2.0,
        maxDesejavel: 10.0,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Produção insuficiente de insulina.", sugestao: "Investigar diabetes tipo 1 ou LADA." },
            alto: { risco: "Resistência Insulínica / Hiperinsulinismo.", sugestao: "Dieta Low Carb, exercícios de força e Berberina." },
            normal: "Sensibilidade à insulina preservada."
        }
    },

    // --- PERFIL LIPÍDICO ---
    COLESTEROL_TOTAL: {
        name: "Colesterol Total",
        aliases: ["Colest. Total", "CHOL"],
        unit: "mg/dL",
        minDesejavel: 120,
        maxDesejavel: 190,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa produção hormonal ou desnutrição.", sugestao: "Aumentar gorduras saudáveis." },
            alto: { risco: "Dislipidemia / Risco aterogênico.", sugestao: "Trocar gorduras saturadas por insaturadas." },
            normal: "Perfil lipídico em equilíbrio."
        }
    },
    HDL: {
        name: "HDL (Bom Colesterol)",
        aliases: ["HDL-c"],
        unit: "mg/dL",
        minDesejavel: 45,
        maxDesejavel: 100,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa proteção cardiovascular.", sugestao: "Aumentar exercícios e Ômega-3." },
            alto: { risco: "Excelente proteção cardiovascular.", sugestao: "Manter bons hábitos." },
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
            baixo: { risco: "Baixo risco aterogênico.", sugestao: "Continuar monitoramento." },
            alto: { risco: "Risco de placas de ateroma.", sugestao: "Reduzir açúcares e gorduras trans." },
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
            baixo: { risco: "Desnutrição ou hipertireoidismo.", sugestao: "Avaliar ingestão calórica." },
            alto: { risco: "Fígado gorduroso e risco cardíaco.", sugestao: "Cortar álcool e carboidratos refinados." },
            normal: "Reserva de gordura em níveis ideais."
        }
    },

    // --- FUNÇÃO HEPÁTICA ---
    AST_TGO: {
        name: "AST (TGO)",
        aliases: ["TGO", "AST"],
        unit: "U/L",
        minDesejavel: 10,
        maxDesejavel: 35,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixo significado clínico.", sugestao: "Manter acompanhamento." },
            alto: { risco: "Lesão hepática ou muscular.", sugestao: "Investigar esteatose ou excesso de medicamentos." },
            normal: "Integridade celular preservada."
        }
    },
    ALT_TGP: {
        name: "ALT (TGP)",
        aliases: ["TGP", "ALT"],
        unit: "U/L",
        minDesejavel: 10,
        maxDesejavel: 35,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixo significado clínico.", sugestao: "Manter acompanhamento." },
            alto: { risco: "Lesão específica do fígado.", sugestao: "Avaliar gordura no fígado (esteatose)." },
            normal: "Função hepática dentro da normalidade."
        }
    },
    GGT: {
        name: "Gama-GT (GGT)",
        aliases: ["GGT"],
        unit: "U/L",
        minDesejavel: 10,
        maxDesejavel: 50,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixo significado clínico.", sugestao: "Nenhuma ação." },
            alto: { risco: "Dano biliar ou consumo excessivo de álcool.", sugestao: "Reduzir toxinas e álcool." },
            normal: "Níveis normais."
        }
    },

    // --- FUNÇÃO RENAL ---
    CREATININA: {
        name: "Creatinina",
        aliases: ["CREA"],
        unit: "mg/dL",
        minDesejavel: 0.6,
        maxDesejavel: 1.2,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa massa muscular.", sugestao: "Avaliar força e ingestão proteica." },
            alto: { risco: "Sobrecarga ou insuficiência renal.", sugestao: "Aumentar hidratação e nefrologista." },
            normal: "Filtragem renal adequada."
        }
    },
    UREIA: {
        name: "Ureia",
        aliases: ["Urea"],
        unit: "mg/dL",
        minDesejavel: 15,
        maxDesejavel: 45,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa ingestão proteica.", sugestao: "Ajustar aporte de aminoácidos." },
            alto: { risco: "Excesso de proteínas ou desidratação.", sugestao: "Equilibrar hidratação e proteínas." },
            normal: "Balanço nitrogenado normal."
        }
    },
    ACIDO_URICO: {
        name: "Ácido Úrico",
        aliases: ["Uric Acid"],
        unit: "mg/dL",
        minDesejavel: 2.5,
        maxDesejavel: 6.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Pode indicar deficiência de purinas.", sugestao: "Avaliar dieta." },
            alto: { risco: "Gota ou hipertensão metabólica.", sugestao: "Reduzir frutose e carnes vermelhas." },
            normal: "Níveis em controle."
        }
    },

    // --- HEMATOLÓGICO E MINERAIS ---
    HEMOGLOBINA: {
        name: "Hemoglobina",
        aliases: ["HGB"],
        unit: "g/dL",
        minDesejavel: 12.0,
        maxDesejavel: 16.0,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Anemia: Baixa oxigenação celular.", sugestao: "Suplementar ferro, B12 ou folato." },
            alto: { risco: "Sangue espesso ou desidratação.", sugestao: "Investigar causas pulmonares ou fumo." },
            normal: "Oxigenação tecidual correta."
        }
    },
    FERRITINA: {
        name: "Ferritina",
        aliases: ["Ferro Estoque"],
        unit: "ng/mL",
        minDesejavel: 30,
        maxDesejavel: 300,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Deficiência de ferro / Anemia.", sugestao: "Aumentar carnes vermelhas, feijão e Vit C." },
            alto: { risco: "Inflamação crônica ou hemocromatose.", sugestao: "Investigar PCR e focos inflamatórios." },
            normal: "Estoques de ferro saudáveis."
        }
    },
    VITAMINA_B12: {
        name: "Vitamina B12",
        aliases: ["Cobalamina"],
        unit: "pg/mL",
        minDesejavel: 400,
        maxDesejavel: 900,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Alteração neurológica e anemia mega.", sugestao: "Suplementar Metilcobalamina." },
            alto: { risco: "Geralmente por suplementação excessiva.", sugestao: "Ajustar dose de suplemento." },
            normal: "Boa proteção nervosa e cognitiva."
        }
    },
    VITAMINA_D: {
        name: "Vitamina D (25-OH)",
        aliases: ["Vit D"],
        unit: "ng/mL",
        minDesejavel: 30,
        maxDesejavel: 100,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Baixa imunidade e fragilidade óssea.", sugestao: "Exposição solar e Vit D3." },
            alto: { risco: "Risco de excesso de cálcio.", sugestao: "Monitorar ingestão." },
            normal: "Imunidade e ossos protegidos."
        }
    },

    // --- INFLAMAÇÃO E TIROIDE ---
    PCR_ULTRASSENSIVEL: {
        name: "PCR Ultrassensível",
        aliases: ["PCR-us", "C-Reactive Protein"],
        unit: "mg/L",
        minDesejavel: 0,
        maxDesejavel: 1.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Nível ideal: sem inflamação.", sugestao: "Manter estilo de vida." },
            alto: { risco: "Inflamação subclínica e risco cardíaco.", sugestao: "Protocolo anti-inflamatório (Cúrcuma, Omega 3)." },
            normal: "Nível aceitável."
        }
    },
    HOMOCISTEINA: {
        name: "Homocisteína",
        aliases: ["HCY"],
        unit: "umol/L",
        minDesejavel: 5.0,
        maxDesejavel: 10.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa transulfuração.", sugestao: "Avaliar aporte proteico." },
            alto: { risco: "Alto risco cardiovascular e neuro.", sugestao: "Metilfolato e B12; reduzir estresse." },
            normal: "Metilação em bom estado."
        }
    },
    TSH: {
        name: "TSH",
        aliases: ["Tireoestimulante"],
        unit: "uUI/mL",
        minDesejavel: 0.4,
        maxDesejavel: 4.5,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipertireoidismo.", sugestao: "Avaliar T4 e T3 livre." },
            alto: { risco: "Hipotireoidismo.", sugestao: "Investigar Hashimoto e Selênio/Iodo." },
            normal: "Metabolismo tireoidiano estável."
        }
    },
    ACIDO_FOLICO: {
        name: "Ácido Fólico (Vit B9)",
        aliases: ["Folato", "Vitamina B9"],
        unit: "ng/mL",
        minDesejavel: 5,
        maxDesejavel: 20,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Anemia e risco de má-formação fetal.", sugestao: "Metilfolato e folhas verdes escuras." },
            alto: { risco: "Excesso de suplementação.", sugestao: "Rever doses de complexo B." },
            normal: "Níveis adequados."
        }
    },
    MAGNESIO: {
        name: "Magnésio Sérico",
        aliases: ["Mg", "Magnesium"],
        unit: "mg/dL",
        minDesejavel: 1.8,
        maxDesejavel: 2.6,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Cãibras, irritabilidade e arritmia.", sugestao: "Suplementar Magnésio Quelato/Malato." },
            alto: { risco: "Raro, geralmente por insuficiência renal.", sugestao: "Avaliar função renal." },
            normal: "Cofator enzimático em equilíbrio."
        }
    },
    CALCIO: {
        name: "Cálcio Total",
        aliases: ["Ca"],
        unit: "mg/dL",
        minDesejavel: 8.5,
        maxDesejavel: 10.2,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipocalcemia: Risco ósseo e muscular.", sugestao: "Avaliar Vit D e ingestão de cálcio." },
            alto: { risco: "Hipercalcemia: Risco de pedras nos rins.", sugestao: "Avaliar tireoide e Vit D." },
            normal: "Metabolismo do cálcio normal."
        }
    },
    ALBUMINA: {
        name: "Albúmina",
        aliases: ["ALB"],
        unit: "g/dL",
        minDesejavel: 3.5,
        maxDesejavel: 5.2,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Desnutrição proteica ou problema hepático.", sugestao: "Aumentar proteínas de alto valor biológico." },
            alto: { risco: "Desidratação.", sugestao: "Aumentar ingestão hídrica." },
            normal: "Estado nutricional proteico adequado."
        }
    }
};
