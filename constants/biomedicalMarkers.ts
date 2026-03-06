
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
    HEMATOCRITO: {
        name: "Hematócrito",
        aliases: ["HT", "HCT"],
        unit: "%",
        minDesejavel: 36,
        maxDesejavel: 50,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Anemia ou hemodiluição.", sugestao: "Avaliar junto com hemoglobina." },
            alto: { risco: "Policitemia ou desidratação.", sugestao: "HIDRATAÇÃO ADEQUADA." },
            normal: "Proporção de células vermelhas normal."
        }
    },
    VCM: {
        name: "VCM",
        aliases: ["Volume Corpuscular Médio"],
        unit: "fL",
        minDesejavel: 80,
        maxDesejavel: 100,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Anemia Microcítica (Ferropriva/Talassemia).", sugestao: "Investigar estoques de ferro." },
            alto: { risco: "Anemia Macrocítica (B12/Folato).", sugestao: "Investigar B12 e Ácido Fólico." },
            normal: "Tamanho das hemácias normal."
        }
    },
    HCM: {
        name: "HCM",
        aliases: ["Hemoglobina Corpuscular Média"],
        unit: "pg",
        minDesejavel: 26,
        maxDesejavel: 34,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Hipocromia (Anemia ferropriva).", sugestao: "Avaliar suplementação de ferro." },
            alto: { risco: "Hipercromia.", sugestao: "Investigar causas de macrocitose." },
            normal: "Teor de hemoglobina por hemácia normal."
        }
    },
    CHCM: {
        name: "CHCM",
        aliases: ["Concentração de Hemoglobina Corpuscular Média"],
        unit: "g/dL",
        minDesejavel: 31,
        maxDesejavel: 36,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Hipocromia acentuada.", sugestao: "Avaliar severidade da anemia." },
            alto: { risco: "Esferocitose ou artefatos.", sugestao: "Avaliar lâmina." },
            normal: "Concentração normal."
        }
    },
    RDW: {
        name: "RDW",
        aliases: ["Amplitude de Distribuição de Hemácias"],
        unit: "%",
        minDesejavel: 11.5,
        maxDesejavel: 14.5,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Pouca variação no tamanho (normal).", sugestao: "N/A" },
            alto: { risco: "Anisocitose (Variação de tamanho).", sugestao: "Pode indicar início de anemia ferropriva." },
            normal: "Uniformidade no tamanho das hemácias."
        }
    },
    SEGMENTADOS: {
        name: "Neutrófilos Segmentados",
        aliases: ["Segmentados", "Neutrófilos"],
        unit: "%",
        minDesejavel: 45,
        maxDesejavel: 70,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Neutropenia (Risco de infecções).", sugestao: "Monitorar imunidade." },
            alto: { risco: "Infecções bacterianas ou inflamação aguda.", sugestao: "Afastar processos infecciosos." },
            normal: "Defesa bacteriana normal."
        }
    },
    LINFOCITOS: {
        name: "Linfócitos",
        aliases: ["LYM"],
        unit: "%",
        minDesejavel: 20,
        maxDesejavel: 45,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Linfocitopenia (Imunodeficiência/Stress).", sugestao: "Avaliar cortisol e estado imunológico." },
            alto: { risco: "Infecções virais ou processos crônicos.", sugestao: "Investigar viroses recentes." },
            normal: "Imunidade adaptativa normal."
        }
    },
    MONOCITOS: {
        name: "Monócitos",
        aliases: ["MON"],
        unit: "%",
        minDesejavel: 2,
        maxDesejavel: 10,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Baixa relevância.", sugestao: "N/A" },
            alto: { risco: "Monocitose (Inflamação crônica ou final de infecção).", sugestao: "Aguardar recuperação tecidual." },
            normal: "Fagocitose normal."
        }
    },
    EOSINOFILOS: {
        name: "Eosinófilos",
        aliases: ["EOS"],
        unit: "%",
        minDesejavel: 1,
        maxDesejavel: 4,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Eosinopenia (Stress agudo).", sugestao: "Avaliar carga de treino/stress." },
            alto: { risco: "Alergias ou Parasitoses.", sugestao: "Vermífugos ou controle de alérgenos." },
            normal: "Nível basal normal."
        }
    },
    BASOFILOS: {
        name: "Basófilos",
        aliases: ["BAS"],
        unit: "%",
        minDesejavel: 0,
        maxDesejavel: 1,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Processos alérgicos crônicos ou hipersensibilidade.", sugestao: "Avaliar inflamação sitêmica." },
            normal: "Normal."
        }
    },
    HEMOGRAMA_COMPLETO: {
        name: "Hemograma Completo",
        aliases: ["CBC", "Hemograma"],
        unit: "Painel",
        minDesejavel: 0,
        maxDesejavel: 0,
        tipo: 'HEMATOLOGICO',
        interpretacao: {
            baixo: { risco: "Analise os marcadores individuais.", sugestao: "Verificar Hb e Leuco." },
            alto: { risco: "Analise os marcadores individuais.", sugestao: "Verificar Leuco e Plaq." },
            normal: "Hemograma dentro da normalidade."
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
    FERRITINA: {
        name: "Ferritina",
        aliases: ["FER"],
        unit: "ng/mL",
        minDesejavel: 30,
        maxDesejavel: 200,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Anemia Ferropriva (estoque baixo).", sugestao: "Reposição de ferro e Vit C." },
            alto: { risco: "Inflamação ou excesso de ferro.", sugestao: "Avaliar PCR e saturação de transferrina." },
            normal: "Estoques de ferro adequados."
        }
    },
    FERRO_SERICO: {
        name: "Ferro Sérico",
        aliases: ["Ferro"],
        unit: "ug/dL",
        minDesejavel: 60,
        maxDesejavel: 160,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Ferropenia.", sugestao: "Aumentar ingestão de carnes e vegetais escuros." },
            alto: { risco: "Hemocromatose ou excesso de suplementação.", sugestao: "Monitorar ingestão." },
            normal: "Nível circulante normal."
        }
    },
    ZINCO: {
        name: "Zinco",
        aliases: ["Zn"],
        unit: "ug/dL",
        minDesejavel: 70,
        maxDesejavel: 120,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixa imunidade e queda de cabelo.", sugestao: "Suplementar Quelado ou sementes de abóbora." },
            alto: { risco: "Inibição da absorção de cobre.", sugestao: "Monitorar suplementação longa." },
            normal: "Nível mineral saudável."
        }
    },
    SELENIO: {
        name: "Selênio",
        aliases: ["Se"],
        unit: "ug/L",
        minDesejavel: 80,
        maxDesejavel: 160,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Disfunção tireoidiana.", sugestao: "Consumir 2 castanhas-do-pará por dia." },
            alto: { risco: "Selenose (toxicidade).", sugestao: "Ajustar suplementação." },
            normal: "Apoio antioxidante normal."
        }
    },
    ACIDO_FOLICO: {
        name: "Ácido Fólico (B9)",
        aliases: ["Folato"],
        unit: "ng/mL",
        minDesejavel: 4.6,
        maxDesejavel: 18.7,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Anemia megaloblástica.", sugestao: "Metilfolato e folhas verdes." },
            alto: { risco: "Suplementação excessiva.", sugestao: "Ajustar dose." },
            normal: "Divisão celular protegida."
        }
    },
    PCR_ULTRASENSIVEL: {
        name: "PCR Ultra-sensível",
        aliases: ["PCR", "C-Reactive Protein"],
        unit: "mg/L",
        minDesejavel: 0,
        maxDesejavel: 1.0,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Baixo risco inflamatório.", sugestao: "Fator protetivo." },
            alto: { risco: "Inflamação sistêmica ou risco cardiovascular.", sugestao: "Acima de 3.0: Risco aumentado. Acima de 10.0: Infecção aguda." },
            normal: "Ausência de inflamação sistêmica significativa."
        }
    },
    HOMOCISTEINA: {
        name: "Homocisteína",
        aliases: ["HCY"],
        unit: "umol/L",
        minDesejavel: 5,
        maxDesejavel: 10,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Sem relevância clínica clara.", sugestao: "N/A" },
            alto: { risco: "Risco Cardiovascular e de Trombose.", sugestao: "Suplementar Complexo B (B6, B9, B12)." },
            normal: "Saúde endotelial protegida."
        }
    },
    VHS: {
        name: "VHS (1ª hora)",
        aliases: ["Velocidade de Hemossedimentação"],
        unit: "mm",
        minDesejavel: 0,
        maxDesejavel: 20,
        tipo: 'BIOQUIMICO',
        interpretacao: {
            baixo: { risco: "Normal.", sugestao: "N/A" },
            alto: { risco: "Inflamação ou infecção inespecífica.", sugestao: "Investigar foco inflamatório." },
            normal: "Velocidade normal."
        }
    },
    FIBRINOGENIO: {
        name: "Fibrinogênio",
        aliases: ["FIB"],
        unit: "mg/dL",
        minDesejavel: 200,
        maxDesejavel: 400,
        tipo: 'COAGULACAO',
        interpretacao: {
            baixo: { risco: "Risco hemorrágico.", sugestao: "Avaliar coagulação." },
            alto: { risco: "Inflamação aguda ou risco de trombose.", sugestao: "Avaliar PCR." },
            normal: "Normal."
        }
    },
    LH: {
        name: "LH",
        aliases: ["Hormônio Luteinizante"],
        unit: "mUI/mL",
        minDesejavel: 1.5,
        maxDesejavel: 12.0,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipogonadismo hipogonadotrófico.", sugestao: "Avaliar eixo HPT." },
            alto: { risco: "Falência gonadal ou Climatério.", sugestao: "Investigar SOP ou Menopausa." },
            normal: "Comando hormonal equilibrado."
        }
    },
    FSH: {
        name: "FSH",
        aliases: ["Hormônio Folículo-Estimulante"],
        unit: "mUI/mL",
        minDesejavel: 1.5,
        maxDesejavel: 12.0,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Disfunção hipofisária.", sugestao: "Avaliar libido e fertilidade." },
            alto: { risco: "Insuciência ovariana ou testicular.", sugestao: "Investigar reserva ovariana." },
            normal: "Estimulação gonadal normal."
        }
    },
    ESTRADIOL: {
        name: "Estradiol (E2)",
        aliases: ["Estrógeno", "E2"],
        unit: "pg/mL",
        minDesejavel: 20,
        maxDesejavel: 150,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Ressecamento e risco de osteoporose.", sugestao: "Avaliar TRH em mulheres." },
            alto: { risco: "Dominância Estrogênica.", sugestao: "Investigar ginecomastia em homens ou pólipos em mulheres." },
            normal: "Ciclo hormonal preservado."
        }
    },
    PROGESTERONA: {
        name: "Progesterona",
        aliases: ["PROG"],
        unit: "ng/mL",
        minDesejavel: 0.5,
        maxDesejavel: 20,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Dificuldade de manutenção de gravidez ou ansiedade.", sugestao: "Avaliar fase lútea." },
            alto: { risco: "Sem relevância clínica (exceto gravidez).", sugestao: "N/A" },
            normal: "Fase do ciclo adequada."
        }
    },
    PROLACTINA: {
        name: "Prolactina",
        aliases: ["PRL"],
        unit: "ng/mL",
        minDesejavel: 4,
        maxDesejavel: 23,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Raro clínica.", sugestao: "N/A" },
            alto: { risco: "Hiperprolactinemia (Estresse ou Prolactinoma).", sugestao: "Evitar estímulos mamários antes do exame e controlar stress." },
            normal: "Normal."
        }
    },
    TESTOSTERONA_TOTAL: {
        name: "Testosterona Total",
        aliases: ["Testo", "T Total"],
        unit: "ng/dL",
        minDesejavel: 300,
        maxDesejavel: 900,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipogonadismo / Perda de libido e massa magra.", sugestao: "Higiene do sono, treinamento resistido e Ashwagandha." },
            alto: { risco: "Suplementação exógena ou tumor raro.", sugestao: "Ajustar dose se em reposição." },
            normal: "Vitalidade e vigor preservados."
        }
    },
    TESTOSTERONA_LIVRE: {
        name: "Testosterona Livre",
        aliases: ["T Livre"],
        unit: "pg/mL",
        minDesejavel: 5,
        maxDesejavel: 25,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Baixa disponibilidade biológica.", sugestao: "Avaliar SHBG alto." },
            alto: { risco: "Livre circulante alta.", sugestao: "Risco de oleosidade e acne." },
            normal: "Biodisponibilidade adequada."
        }
    },
    SHBG: {
        name: "SHBG",
        aliases: ["Globulina Ligadora de Hormônios Sexuais"],
        unit: "nmol/L",
        minDesejavel: 15,
        maxDesejavel: 60,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Muito hormônio livre (risco androgênico).", sugestao: "Avaliar Resistência Insulínica." },
            alto: { risco: "Pouco hormônio livre (baixa libido).", sugestao: "Investigar excesso de fibras ou estrogênio." },
            normal: "Transporte hormonal normal."
        }
    },
    DHT: {
        name: "Di-hidrotestosterona (DHT)",
        aliases: ["DHT"],
        unit: "pg/mL",
        minDesejavel: 250,
        maxDesejavel: 990,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Baixa libido masculina.", sugestao: "Cuidado com bloqueadores de 5-alpha-redutase." },
            alto: { risco: "Queda de cabelo e acne.", sugestao: "Saw Palmetto ou Finasterida sob orientação." },
            normal: "Normal."
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
    T3_TOTAL: {
        name: "T3 Total",
        aliases: ["Triiodotironina Total"],
        unit: "ng/dL",
        minDesejavel: 80,
        maxDesejavel: 200,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipotireoidismo ou conversão lenta.", sugestao: "Avaliar Selênio e Zinco." },
            alto: { risco: "Hipertireoidismo.", sugestao: "Avaliar sinais clínicos de agitação." },
            normal: "Nível total adequado."
        }
    },
    T3_LIVRE: {
        name: "T3 Livre",
        aliases: ["FT3", "Triiodotironina Livre"],
        unit: "pg/mL",
        minDesejavel: 2.0,
        maxDesejavel: 4.4,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipotireoidismo subclínico ou baixa conversão.", sugestao: "Melhorar saúde hepática e micronutrientes." },
            alto: { risco: "Tireotoxicose.", sugestao: "Monitoramento endócrino." },
            normal: "Forma ativa do hormônio em equilíbrio."
        }
    },
    T4_TOTAL: {
        name: "T4 Total",
        aliases: ["Tiroxina Total"],
        unit: "ug/dL",
        minDesejavel: 4.5,
        maxDesejavel: 12.0,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipotireoidismo central ou primário.", sugestao: "Avaliar TSH." },
            alto: { risco: "Hipertireoidismo.", sugestao: "Avaliar causas de tireoidite." },
            normal: "Produção glandular adequada."
        }
    },
    T4_LIVRE: {
        name: "T4 Livre",
        aliases: ["FT4", "Tiroxina Livre"],
        unit: "ng/dL",
        minDesejavel: 0.9,
        maxDesejavel: 1.7,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Hipotireoidismo.", sugestao: "Dosagem de reposição pode ser necessária." },
            alto: { risco: "Hipertireoidismo.", sugestao: "Investigar doença de Graves." },
            normal: "Disponibilidade hormonal adequada."
        }
    },
    ANTI_TPO: {
        name: "Anti-TPO",
        aliases: ["Anticorpos Anti-Peroxidase Tireoidiana"],
        unit: "UI/mL",
        minDesejavel: 0,
        maxDesejavel: 34,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Normal (Negativo).", sugestao: "Ausência de autoimunidade tireoidiana." },
            alto: { risco: "Tireoidite de Hashimoto.", sugestao: "Dieta anti-inflamatória e controle de glúten." },
            normal: "Sem reação autoimune detectada."
        }
    },
    ANTI_TIREOGLOBULINA: {
        name: "Anti-Tireoglobuína",
        aliases: ["Anti-TG"],
        unit: "UI/mL",
        minDesejavel: 0,
        maxDesejavel: 115,
        tipo: 'HORMONAL',
        interpretacao: {
            baixo: { risco: "Normal (Negativo).", sugestao: "N/A" },
            alto: { risco: "Marcador de autoimunidade tireoidiana.", sugestao: "Correlacionar com Anti-TPO e Ultrassom." },
            normal: "Normal."
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
