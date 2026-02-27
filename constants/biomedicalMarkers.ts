
export interface MarkerReference {
    name: string;
    aliases: string[];
    unit: string;
    minDesejavel: number;
    maxDesejavel: number;
    minCritico?: number;
    maxCritico?: number;
    tipo: 'BIOQUIMICO' | 'HORMONAL' | 'HEMATOLOGICO' | 'GASOMETRIA' | 'TOXICOLOGICO' | 'COAGULACAO' | 'MARCADOR_TUMORAL';
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
        minCritico: 45,
        maxCritico: 450,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipoglicemia grave.", sugestao: "Abaixo de 45: Coma neuroglicopênico." },
            alto: { risco: "Diabetes ou Hiperglicemia crítica.", sugestao: "Acima de 450: Risco de Cetoacidose ou Coma Diabético." },
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

    // --- FUNÇÃO HEPÁTICA E BIOQUÍMICA CRÍTICA ---
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
    LDH: {
        name: "LDH",
        aliases: ["Lactato Desidrogenase", "DHL"],
        unit: "U/L",
        minDesejavel: 120,
        maxDesejavel: 250,
        maxCritico: 1000,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Sem relevância clara.", sugestao: "Monitorar." },
            alto: { risco: "Dano celular sistêmico ou hemólise.", sugestao: "Acima de 1000: Notificação imediata (depende da clínica)." },
            normal: "Integridade tecidual normal."
        }
    },
    LIPASE: {
        name: "Lipase",
        aliases: ["LIP"],
        unit: "U/L",
        minDesejavel: 0,
        maxDesejavel: 60,
        maxCritico: 700,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Sem relevância clínica.", sugestao: "N/A" },
            alto: { risco: "Pancreatite Aguda.", sugestao: "Investigar dor abdominal súbita. Acima de 700 é Alerta Crítico." },
            normal: "Função pancreática normal."
        }
    },
    LACTATO: {
        name: "Lactato",
        aliases: ["Ácido Lático"],
        unit: "mmol/L",
        minDesejavel: 0.5,
        maxDesejavel: 2.2,
        maxCritico: 5.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Bom.", sugestao: "Manter." },
            alto: { risco: "Hipóxia tecidual tipo A.", sugestao: "Acima de 5.0: Insuficiência de oxigenação tecidual." },
            normal: "Metabolismo aeróbico normal."
        }
    },
    FOSFORO: {
        name: "Fósforo",
        aliases: ["P", "Phosphate"],
        unit: "mg/dL",
        minDesejavel: 2.5,
        maxDesejavel: 4.5,
        minCritico: 1.0,
        maxCritico: 9.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Fraqueza muscular, confusão, falência respiratória.", sugestao: "Abaixo de 1.0: Sintomas graves de SNC." },
            alto: { risco: "Insuficiência renal ou lise tumoral aguda.", sugestao: "Acima de 9.0: Risco de calcificação ectópica." },
            normal: "Equilíbrio mineral adequado."
        }
    },
    OSMOLALIDADE_PLASMATICA: {
        name: "Osmolalidade Plasmática",
        aliases: ["Osmolalidade"],
        unit: "mOsm/Kg H2O",
        minDesejavel: 285,
        maxDesejavel: 295,
        minCritico: 240,
        maxCritico: 330,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hiposmolalidade: Edema celular.", sugestao: "Abaixo de 240: Sintomas neuropsiquiátricos." },
            alto: { risco: "Hiperosmolalidade: Perda de água intracelular.", sugestao: "Acima de 330: Coma e desidratação neuronal." },
            normal: "Equilíbrio osmótico estável."
        }
    },
    GAP_OSMOLAR: {
        name: "Gap Osmolar",
        aliases: ["Osmolar Gap"],
        unit: "mOsm/Kg H2O",
        minDesejavel: 0,
        maxDesejavel: 10,
        maxCritico: 10,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "Sem ação." },
            alto: { risco: "Presença de substâncias não medidas.", sugestao: "Investigar intoxicação: Etanol, Metanol, Etilenoglicol." },
            normal: "Ausência de gaps osmóticos anômalos."
        }
    },
    AMONIA: {
        name: "Amônia",
        aliases: ["NH3"],
        unit: "mg/dL",
        minDesejavel: 15,
        maxDesejavel: 45,
        maxCritico: 100,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Incomum.", sugestao: "Reavaliar." },
            alto: { risco: "Risco de Encefalopatia Hepática.", sugestao: "Acima de 100: Neurotoxicidade aguda." },
            normal: "Metabolismo da ureia normal."
        }
    },
    TROPONINA: {
        name: "Troponina",
        aliases: ["Tropo", "cTnT"],
        unit: "ng/mL",
        minDesejavel: 0,
        maxDesejavel: 0.04,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Lesão Miocárdica (Infarto).", sugestao: "Emergência cardiológica se aumentada." },
            normal: "Coração sem sinais de lesão aguda."
        }
    },

    // --- FUNÇÃO RENAL ---
    CREATININA: {
        name: "Creatinina",
        aliases: ["CREA"],
        unit: "mg/dL",
        minDesejavel: 0.6,
        maxDesejavel: 1.2,
        maxCritico: 7.4,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa massa muscular.", sugestao: "Avaliar força e ingestão proteica." },
            alto: { risco: "Sobrecarga ou insuficiência renal.", sugestao: "Acima de 7.4 indica falência orgânica ou sepse." },
            normal: "Filtragem renal adequada."
        }
    },
    UREIA: {
        name: "Ureia",
        aliases: ["Urea"],
        unit: "mg/dL",
        minDesejavel: 15,
        maxDesejavel: 45,
        maxCritico: 214,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa ingestão proteica.", sugestao: "Ajustar aporte de aminoácidos." },
            alto: { risco: "Insuficiência renal aguda.", sugestao: "Acima de 214: Urência dialítica provável." },
            normal: "Balanço nitrogenado normal."
        }
    },
    BILIRRUBINA_TOTAL: {
        name: "Bilirrubina Total",
        aliases: ["BT", "Bili"],
        unit: "mg/dL",
        minDesejavel: 0.3,
        maxDesejavel: 1.2,
        maxCritico: 15,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Sem significado.", sugestao: "N/A" },
            alto: { risco: "Doença hepatobiliar ou hemólise.", sugestao: "Acima de 15: Elevado risco de contágio/severidade." },
            normal: "Drenagem biliar normal."
        }
    },
    SODIO: {
        name: "Sódio",
        aliases: ["Na"],
        unit: "mEq/L",
        minDesejavel: 135,
        maxDesejavel: 145,
        minCritico: 120,
        maxCritico: 160,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hiponatremia: Confusão, espasmos, coma.", sugestao: "Abaixo de 120: Risco neurológico grave." },
            alto: { risco: "Hipernatremia: Desidratação neuronal.", sugestao: "Acima de 160: Risco de trombose e hipotensão." },
            normal: "Equilíbrio eletrolítico estável."
        }
    },
    POTASSIO: {
        name: "Potássio",
        aliases: ["K"],
        unit: "mEq/L",
        minDesejavel: 3.5,
        maxDesejavel: 5.1,
        minCritico: 2.5,
        maxCritico: 6.5,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipocalemia: Arritmias e paralisia.", sugestao: "Abaixo de 2.5: Risco de parada respiratória." },
            alto: { risco: "Hipercalemia: Risco iminente de parada cardíaca.", sugestao: "Acima de 6.5: Emergência absoluta." },
            normal: "Níveis saudáveis para sinalização cardíaca."
        }
    },
    CALCIO_TOTAL: {
        name: "Cálcio Total",
        aliases: ["Ca"],
        unit: "mg/dL",
        minDesejavel: 8.5,
        maxDesejavel: 10.2,
        minCritico: 7.0,
        maxCritico: 12.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipocalcemia: Tetania, convulsões.", sugestao: "Abaixo de 7.0: Hipotensão refratária." },
            alto: { risco: "Hipercalcemia: Alteração mental, letargia.", sugestao: "Acima de 12.0: Fraqueza muscular severa." },
            normal: "Metabolismo de cálcio equilibrado."
        }
    },
    CALCIO_IONICO: {
        name: "Cálcio Iônico",
        aliases: ["Ca++"],
        unit: "mg/dL",
        minDesejavel: 4.5,
        maxDesejavel: 5.3,
        minCritico: 3.2,
        maxCritico: 6.2,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipocalcemia grave.", sugestao: "Abaixo de 3.2: Tetania e depressão cardíaca." },
            alto: { risco: "Hipercalcemia grave.", sugestao: "Acima de 6.2: Náuseas e letargia extrema." },
            normal: "Nível fisiologicamente ativo correto."
        }
    },
    CLORETOS: {
        name: "Cloretos",
        aliases: ["Cl"],
        unit: "mEq/L",
        minDesejavel: 96,
        maxDesejavel: 106,
        minCritico: 75,
        maxCritico: 125,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Risco de alcalose metabólica.", sugestao: "Repor se abaixo de 75." },
            alto: { risco: "Acidose hiperclorêmica.", sugestao: "Acima de 125: Acidose metabólica primária." },
            normal: "Equilíbrio aniônico normal."
        }
    },
    MAGNESIO: {
        name: "Magnésio",
        aliases: ["Mg"],
        unit: "mg/dL",
        minDesejavel: 1.7,
        maxDesejavel: 2.5,
        minCritico: 1.0,
        maxCritico: 4.9,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Hipomagnesemia: Parestesias, arritmias.", sugestao: "Abaixo de 1.0: Tetania atetóide." },
            alto: { risco: "Hipermagnesemia: Fraqueza e redução de reflexos.", sugestao: "Acima de 4.9: Hipoventilação e sedação." },
            normal: "Minerais intracelulares em equilíbrio."
        }
    },
    ACIDO_URICO: {
        name: "Ácido Úrico",
        aliases: ["Uric Acid"],
        unit: "mg/dL",
        minDesejavel: 2.4,
        maxDesejavel: 6.0,
        maxCritico: 13,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Incomum.", sugestao: "Investigar herança ou medicamentos." },
            alto: { risco: "Gota ou Nefropatia aguda.", sugestao: "Acima de 13: Risco de bloqueio tubular renal." },
            normal: "Eliminação adequada de purinas."
        }
    },

    // --- HEMATOLOGIA E COAGULAÇÃO ---
    HEMOGLOBINA: {
        name: "Hemoglobina",
        aliases: ["HGB"],
        unit: "g/dL",
        minDesejavel: 12.0,
        maxDesejavel: 16.0,
        minCritico: 7.0,
        maxCritico: 19.9,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Anemia progressiva.", sugestao: "Abaixo de 13 (H) ou 12 (M): Anemia. Abaixo de 7.0: Protocolo de Transfusão." },
            alto: { risco: "Policitemia / Hiperviscosidade.", sugestao: "Acima de 19.9: Risco de eventos trombóticos." },
            normal: "Oxigenação tecidual correta."
        }
    },
    LEUCOCITOS: {
        name: "Leucócitos",
        aliases: ["WBC", "Globulos Brancos"],
        unit: "/mm3",
        minDesejavel: 4000,
        maxDesejavel: 11000,
        minCritico: 2000,
        maxCritico: 50000,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Leucopenia. Abaixo de 2000: Risco alto de infecção.", sugestao: "Proteção imunológica imediata." },
            alto: { risco: "Leucocitose. Acima de 50000: Reação leucemóide ou leucemia.", sugestao: "Emergência hematológica." },
            normal: "Defesa imunológica estável."
        }
    },
    PLAQUETAS: {
        name: "Plaquetas",
        aliases: ["PLT"],
        unit: "/mm3",
        minDesejavel: 150000,
        maxDesejavel: 450000,
        minCritico: 20000,
        maxCritico: 1000000,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Plaquetopenia. Abaixo de 20000: Risco de hemorragia espontânea.", sugestao: "Repouso absoluto e hematologista." },
            alto: { risco: "Trombocitose. Acima de 1M: Risco severo de trombose.", sugestao: "Investigar causas reacionais ou mieloproliferativas." },
            normal: "Coagulação equilibrada."
        }
    },
    RNI: {
        name: "RNI (Coagulação)",
        aliases: ["INR", "Protrombina"],
        unit: "ratio",
        minDesejavel: 0.8,
        maxDesejavel: 1.2,
        maxCritico: 4.0,
        tipo: 'COAGULACAO',
        interpretacao: {
            baixo: { risco: "Risco de trombose.", sugestao: "Avaliar uso de anticoagulantes." },
            alto: { risco: "Risco Hemorrágico. Acima de 4.0: Extremo perigo.", sugestao: "Ajustar Varfarina/Cumarínicos." },
            normal: "Tempo de protrombina normal."
        }
    },
    DIMERO_D: {
        name: "Dímero-D",
        aliases: ["D-Dimer"],
        unit: "ng/mL",
        minDesejavel: 0,
        maxDesejavel: 500,
        tipo: 'COAGULACAO',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Indicativo de trombose ou CID.", sugestao: "Investigar TVP ou Embolia Pulmonar." },
            normal: "Ausência de fibrina degradada significativa."
        }
    },

    // --- GASOMETRIA ---
    PH_ARTERIAL: {
        name: "pH Arterial",
        aliases: ["pH"],
        unit: "pH",
        minDesejavel: 7.35,
        maxDesejavel: 7.45,
        minCritico: 7.2,
        maxCritico: 7.6,
        tipo: 'GASOMETRIA',
        interpretacao: {
            baixo: { risco: "Acidose. Abaixo de 7.2: Risco de morte.", sugestao: "Emergência hospitalar imediata." },
            alto: { risco: "Alcalose. Acima de 7.6: Risco de morte.", sugestao: "Emergência hospitalar imediata." },
            normal: "Equilíbrio ácido-base perfeito."
        }
    },
    PCO2: {
        name: "PCO2",
        aliases: ["Pressão CO2"],
        unit: "mmHg",
        minDesejavel: 35,
        maxDesejavel: 45,
        minCritico: 19,
        maxCritico: 67,
        tipo: 'GASOMETRIA',
        interpretacao: {
            baixo: { risco: "Hiperventilação.", sugestao: "Avaliar centro respiratório." },
            alto: { risco: "Hipoventilação / Acidose Respiratória.", sugestao: "Avaliar troca gasosa pulmonar." },
            normal: "Eliminação de CO2 adequada."
        }
    },

    // --- TOXICOLOGIA ---
    DIGOXINA: {
        name: "Digoxina",
        aliases: ["Lanoxin"],
        unit: "ng/mL",
        minDesejavel: 0.8,
        maxDesejavel: 2.0,
        tipo: 'TOXICOLOGICO',
        interpretacao: {
            baixo: { risco: "Abaixo da faixa terapêutica.", sugestao: "Ajustar dose." },
            alto: { risco: "Toxicidade Digitálica. Acima de 2.0: Náuseas, arritmias.", sugestao: "Suspender e reavaliar." },
            normal: "Nível terapêutico."
        }
    },
    LITIO: {
        name: "Lítio",
        aliases: ["Li"],
        unit: "mEq/L",
        minDesejavel: 0.6,
        maxDesejavel: 1.2,
        maxCritico: 1.5,
        tipo: 'TOXICOLOGICO',
        interpretacao: {
            baixo: { risco: "Subterapêutico.", sugestao: "Avaliar adesão ao tratamento." },
            alto: { risco: "Toxicidade: Tremores, confusão. Acima de 1.5 é Alerta.", sugestao: "Hidratação e suspensão temporária." },
            normal: "Nível terapêutico seguro."
        }
    },

    // --- VITAMINAS E MINERAIS ---
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

    // --- MARCADORES TUMORAIS ---
    AFP: {
        name: "AFP (Alfa-fetoproteína)",
        aliases: ["Alfa-fetoproteína"],
        unit: "ng/mL",
        minDesejavel: 0,
        maxDesejavel: 8,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Ca Hepatocelular, Embrionário ou Coricarcinoma.", sugestao: "Monitoramento oncológico rigoroso." },
            normal: "Níveis normais para adultos."
        }
    },
    CEA: {
        name: "CEA",
        aliases: ["Antígeno carcinoembrionário"],
        unit: "ng/mL",
        minDesejavel: 0,
        maxDesejavel: 2.5,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Monitoramento ca colorretal, gastrointestinal.", sugestao: "Fumantes podem ter até 5 ng/mL." },
            normal: "Nível seguro."
        }
    },
    CA_125: {
        name: "CA 125",
        aliases: ["CA 125"],
        unit: "U/mL",
        minDesejavel: 0,
        maxDesejavel: 35,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Neoplasias do ovário e do endométrio.", sugestao: "Avaliar exames de imagem pélvicos." },
            normal: "Ausência de elevação tumoral específica."
        }
    },
    CA_15_3: {
        name: "CA 15.3",
        aliases: ["CA 15.3"],
        unit: "U/mL",
        minDesejavel: 0,
        maxDesejavel: 32.4,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Monitoramento de neoplasias da mama.", sugestao: "Acompanhamento clínico." },
            normal: "Nível estável."
        }
    },
    CA_19_9: {
        name: "CA 19.9",
        aliases: ["CA 19.9"],
        unit: "U/mL",
        minDesejavel: 0,
        maxDesejavel: 37,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Neoplasias do pâncreas e colorretais.", sugestao: "Correlacionar com clínica gástrica." },
            normal: "Normal."
        }
    },
    PSA_TOTAL: {
        name: "PSA Total",
        aliases: ["Antígeno Prostático"],
        unit: "ng/mL",
        minDesejavel: 0,
        maxDesejavel: 2.5,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Risco aumentado de câncer de próstata.", sugestao: "Correlacionar com idade e volume prostático." },
            normal: "Nível seguro para rastreio."
        }
    },
    HE4: {
        name: "HE4",
        aliases: ["HE4"],
        unit: "pmol/L",
        minDesejavel: 0,
        maxDesejavel: 150,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Neoplasias do ovário.", sugestao: "Produz quantidades maiores que a proteína CA-125 em alguns casos." },
            normal: "Normal."
        }
    },
    TIREOGLOBULINA: {
        name: "Tireoglobulina",
        aliases: ["TG"],
        unit: "ng/mL",
        minDesejavel: 3.5,
        maxDesejavel: 77,
        tipo: 'MARCADOR_TUMORAL',
        interpretacao: {
            baixo: { risco: "Pós-tireoidectomia radical esperado indetectável.", sugestao: "Acompanhamento pós-cirúrgico." },
            alto: { risco: "Presença de tecidos tireoidianos residuais ou tumor.", sugestao: "Rastreio de recidiva oncológica." },
            normal: "Níveis normais (com tireoide intacta)."
        }
    },
    RFG: {
        name: "Creatinina - Estimativa do RFG",
        aliases: ["RFG", "eGFR", "Filtração Glomerular"],
        unit: "mL/min/1.73 m2",
        minDesejavel: 60,
        maxDesejavel: 120,
        minCritico: 15,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Função renal diminuída.", sugestao: "Abaixo de 60: Doença Renal Crônica. Abaixo de 15: Falência Renal." },
            alto: { risco: "Normal.", sugestao: "N/A" },
            normal: "Taxa de filtração glomerular saudável."
        }
    }
};

export const QUALITATIVE_FINDINGS = [
    { achado: "Leucocitose importante ou blastos", nota: "Possível novo diagnóstico de leucemia" },
    { achado: "Glicosúria e cetonúria", nota: "Cetoacidose diabética" },
    { achado: "Cilindros hemáticos ou Hemácias Dismórficas (>50%)", nota: "Lesão glomerular / Síndrome nefrítica" },
    { achado: "Hemoglobinúria intensa desproporcional", nota: "Mioglobinúria / Síndrome de esmagamento" },
    { achado: "Drepanócitos / Parasitas de Malária", nota: "Drepanocitose ou Malária ativa" },
    { achado: "Cristais de Urato de Sódio / Oxalato de Cálcio", nota: "Risco de Nefrolitíase / Ataque de Gota" },
    { achado: "Sepse Neonatal (Altas concentrações)", nota: "Emergência Pediátrica Imediata" }
];
