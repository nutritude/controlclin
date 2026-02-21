export interface Portion {
  label: string;
  grams: number;
}

export interface FoodNutrients {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  vitaminC_mg?: number;
}

export interface FoodItemCanonical {
  id: string;
  namePt: string;
  category: string;
  shoppingCategory?: string; // Optional for shopping list grouping
  nutrientsPer100g: FoodNutrients;
  portions: Portion[];
}

// Mock Data - expanded from previous MOCK_FOOD_DB in db.ts but structured for the new service
const FOOD_CATALOG: FoodItemCanonical[] = [
  {
    id: 'f1', namePt: 'Arroz Branco Cozido', category: 'Cereais', shoppingCategory: 'Mercearia',
    nutrientsPer100g: { kcal: 128, protein_g: 2.5, carb_g: 28.1, fat_g: 0.2, fiber_g: 1.6, sodium_mg: 1 },
    portions: [{ label: '1 escumadeira', grams: 150 }, { label: '1 colher de sopa', grams: 25 }]
  },
  {
    id: 'f2', namePt: 'Feijão Carioca Cozido', category: 'Leguminosas', shoppingCategory: 'Mercearia',
    nutrientsPer100g: { kcal: 76, protein_g: 4.8, carb_g: 13.6, fat_g: 0.5, fiber_g: 8.5, sodium_mg: 2 },
    portions: [{ label: '1 concha', grams: 130 }, { label: '1 colher de sopa', grams: 20 }]
  },
  {
    id: 'f3', namePt: 'Peito de Frango Grelhado', category: 'Carnes', shoppingCategory: 'Açougue',
    nutrientsPer100g: { kcal: 159, protein_g: 32, carb_g: 0, fat_g: 2.5, fiber_g: 0, sodium_mg: 50 },
    portions: [{ label: '1 filé médio', grams: 100 }, { label: '1 filé pequeno', grams: 80 }]
  },
  {
    id: 'f4', namePt: 'Ovo de Galinha Cozido', category: 'Ovos', shoppingCategory: 'Hortifruti',
    nutrientsPer100g: { kcal: 146, protein_g: 13.3, carb_g: 0.6, fat_g: 9.5, fiber_g: 0, sodium_mg: 135 },
    portions: [{ label: '1 unidade', grams: 50 }]
  },
  {
    id: 'f5', namePt: 'Banana Prata', category: 'Frutas', shoppingCategory: 'Hortifruti',
    nutrientsPer100g: { kcal: 98, protein_g: 1.3, carb_g: 26, fat_g: 0.1, fiber_g: 2, sodium_mg: 0, potassium_mg: 358 },
    portions: [{ label: '1 unidade média', grams: 70 }]
  },
  {
    id: 'f6', namePt: 'Aveia em Flocos', category: 'Cereais', shoppingCategory: 'Mercearia',
    nutrientsPer100g: { kcal: 394, protein_g: 13.9, carb_g: 66.6, fat_g: 8.5, fiber_g: 9.1, sodium_mg: 0 },
    portions: [{ label: '1 colher de sopa', grams: 15 }]
  },
  {
    id: 'f7', namePt: 'Leite Integral', category: 'Laticínios', shoppingCategory: 'Laticínios',
    nutrientsPer100g: { kcal: 60, protein_g: 3.2, carb_g: 4.5, fat_g: 3.3, fiber_g: 0, sodium_mg: 50, calcium_mg: 123 },
    portions: [{ label: '1 copo americano', grams: 200 }, { label: '1 xícara', grams: 240 }]
  },
  {
    id: 'f8', namePt: 'Azeite de Oliva', category: 'Óleos', shoppingCategory: 'Mercearia',
    nutrientsPer100g: { kcal: 884, protein_g: 0, carb_g: 0, fat_g: 100, fiber_g: 0, sodium_mg: 0 },
    portions: [{ label: '1 colher de sopa', grams: 13 }, { label: '1 fio', grams: 5 }]
  },
  {
    id: 'f9', namePt: 'Pão Francês', category: 'Pães', shoppingCategory: 'Padaria',
    nutrientsPer100g: { kcal: 300, protein_g: 8, carb_g: 58, fat_g: 3, fiber_g: 2.3, sodium_mg: 648 },
    portions: [{ label: '1 unidade', grams: 50 }]
  },
  {
    id: 'f10', namePt: 'Queijo Minas Frescal', category: 'Laticínios', shoppingCategory: 'Laticínios',
    nutrientsPer100g: { kcal: 264, protein_g: 17.4, carb_g: 3.2, fat_g: 20.2, fiber_g: 0, sodium_mg: 30, calcium_mg: 500 },
    portions: [{ label: '1 fatia média', grams: 30 }]
  },
  {
    id: 'f11', namePt: 'Batata Doce Cozida', category: 'Tubérculos', shoppingCategory: 'Hortifruti',
    nutrientsPer100g: { kcal: 77, protein_g: 0.6, carb_g: 18.4, fat_g: 0.1, fiber_g: 2.2, sodium_mg: 3 },
    portions: [{ label: '1 unidade média', grams: 140 }, { label: '1 colher de servir', grams: 45 }]
  },
  {
    id: 'f12', namePt: 'Brócolis Cozido', category: 'Vegetais', shoppingCategory: 'Hortifruti',
    nutrientsPer100g: { kcal: 25, protein_g: 2.1, carb_g: 4.4, fat_g: 0.5, fiber_g: 3.4, sodium_mg: 12 },
    portions: [{ label: '1 xícara', grams: 80 }]
  },
  {
    id: 'f13', namePt: 'Maçã Fuji', category: 'Frutas', shoppingCategory: 'Hortifruti',
    nutrientsPer100g: { kcal: 56, protein_g: 0.3, carb_g: 15.2, fat_g: 0.2, fiber_g: 1.3, sodium_mg: 0 },
    portions: [{ label: '1 unidade pequena', grams: 100 }, { label: '1 unidade média', grams: 130 }]
  },
  {
    id: 'f14', namePt: 'Iogurte Natural', category: 'Laticínios', shoppingCategory: 'Laticínios',
    nutrientsPer100g: { kcal: 51, protein_g: 4.1, carb_g: 1.9, fat_g: 3, fiber_g: 0, sodium_mg: 40, calcium_mg: 140 },
    portions: [{ label: '1 pote', grams: 170 }]
  },
  {
    id: 'f15', namePt: 'Castanha do Pará', category: 'Oleaginosas', shoppingCategory: 'Mercearia',
    nutrientsPer100g: { kcal: 656, protein_g: 14.3, carb_g: 12.3, fat_g: 66.4, fiber_g: 7.9, sodium_mg: 0 },
    portions: [{ label: '1 unidade', grams: 5 }, { label: '2 unidades', grams: 10 }]
  }
];

import { ScientificCatalog } from './foodCatalogScientific';

/**
 * Food Service handles interactions with the food catalog
 */
export const FoodService = {
  search: (query: string): FoodItemCanonical[] => {
    if (!query || query.length < 2) return [];

    const scientificResults: FoodItemCanonical[] = [];
    const qNorm = query.toLowerCase().trim();

    // 1. Busca no Catálogo Científico
    const scientificRecords = ScientificCatalog.searchByName(qNorm);
    scientificRecords.forEach(record => {
      scientificResults.push(ScientificCatalog.recordToCanonical(record));
    });

    // 2. Fallback: Catálogo legado
    const legacyResults = FOOD_CATALOG.filter(f =>
      f.namePt.toLowerCase().includes(qNorm)
    );

    // 3. Mesclar (priorizando científico)
    const combined = [...scientificResults];
    const seenNames = new Set(scientificResults.map(r => r.namePt.toLowerCase()));

    for (const leg of legacyResults) {
      if (!seenNames.has(leg.namePt.toLowerCase()) && combined.length < 30) {
        combined.push(leg);
      }
    }

    return combined;
  },

  searchByCategory: (category: string): FoodItemCanonical[] => {
    const scientific = ScientificCatalog.searchByCategory(category);
    const results = scientific.map(r => ScientificCatalog.recordToCanonical(r));

    // Fallback legado
    const legacy = FOOD_CATALOG.filter(f => f.category.toLowerCase().includes(category.toLowerCase()));

    // Mesclar
    const seenIds = new Set(results.map(r => r.id));
    for (const leg of legacy) {
      if (!seenIds.has(leg.id)) results.push(leg);
    }

    return results;
  },

  getById: (id: string): FoodItemCanonical | undefined => {
    // 1. Tentar catálogo legado
    const legacy = FOOD_CATALOG.find(f => f.id === id);
    if (legacy) return legacy;

    // 2. Tentar catálogo científico
    const scientific = ScientificCatalog.getByUID(id);
    if (scientific) {
      return ScientificCatalog.recordToCanonical(scientific);
    }

    return undefined;
  },

  /**
   * Calcula nutrientes totais baseado na porção escolhida e quantidade
   * REGRAS ANVISA (IN 75/2020):
   * - Kcal: Arredondar para inteiro mais próximo (Math.round)
   * - Macronutrientes: Arredondar para 1 casa decimal
   * - Micronutrientes (mg): Arredondar para inteiro (opcional, mas recomendado para mg) ou manter 1 decimal para valores baixos (Fe).
   */
  calculateTotals: (food: FoodItemCanonical, portionIndex: number, quantity: number) => {
    const portion = food.portions[portionIndex] || food.portions[0];
    const totalGrams = portion.grams * quantity;
    const ratio = totalGrams / 100;

    return {
      kcal: Math.round(food.nutrientsPer100g.kcal * ratio),
      protein: parseFloat((food.nutrientsPer100g.protein_g * ratio).toFixed(1)),
      carbs: parseFloat((food.nutrientsPer100g.carb_g * ratio).toFixed(1)),
      fat: parseFloat((food.nutrientsPer100g.fat_g * ratio).toFixed(1)),
      fiber: parseFloat(((food.nutrientsPer100g.fiber_g || 0) * ratio).toFixed(1)),
      sodium: Math.round((food.nutrientsPer100g.sodium_mg || 0) * ratio),
      // Micros (Opcionais) - Arredondamento para melhor visualização clínica
      calcium: food.nutrientsPer100g.calcium_mg ? Math.round(food.nutrientsPer100g.calcium_mg * ratio) : undefined,
      iron: food.nutrientsPer100g.iron_mg ? parseFloat((food.nutrientsPer100g.iron_mg * ratio).toFixed(1)) : undefined,
      potassium: food.nutrientsPer100g.potassium_mg ? Math.round(food.nutrientsPer100g.potassium_mg * ratio) : undefined,
      vitaminC: food.nutrientsPer100g.vitaminC_mg ? Math.round(food.nutrientsPer100g.vitaminC_mg * ratio) : undefined,

      totalGrams
    };
  },

  /**
   * NOVO: Calcula nutrientes baseado em peso livre (gramas/mL) inserido manualmente.
   * Mantém a consistência das regras de arredondamento.
   */
  calculateTotalsFromWeight: (food: FoodItemCanonical, grams: number, quantity: number) => {
    const totalGrams = grams * quantity;
    const ratio = totalGrams / 100;

    return {
      kcal: Math.round(food.nutrientsPer100g.kcal * ratio),
      protein: parseFloat((food.nutrientsPer100g.protein_g * ratio).toFixed(1)),
      carbs: parseFloat((food.nutrientsPer100g.carb_g * ratio).toFixed(1)),
      fat: parseFloat((food.nutrientsPer100g.fat_g * ratio).toFixed(1)),
      fiber: parseFloat(((food.nutrientsPer100g.fiber_g || 0) * ratio).toFixed(1)),
      sodium: Math.round((food.nutrientsPer100g.sodium_mg || 0) * ratio),
      // Micros
      calcium: food.nutrientsPer100g.calcium_mg ? Math.round(food.nutrientsPer100g.calcium_mg * ratio) : undefined,
      iron: food.nutrientsPer100g.iron_mg ? parseFloat((food.nutrientsPer100g.iron_mg * ratio).toFixed(1)) : undefined,
      potassium: food.nutrientsPer100g.potassium_mg ? Math.round(food.nutrientsPer100g.potassium_mg * ratio) : undefined,
      vitaminC: food.nutrientsPer100g.vitaminC_mg ? Math.round(food.nutrientsPer100g.vitaminC_mg * ratio) : undefined,

      totalGrams
    };
  }
};