
import { FoodService, FoodItemCanonical, Portion } from './foodCatalog';

export interface SubstitutionSuggestion {
  food: FoodItemCanonical;
  suggestedPortionIdx: number;
  suggestedQuantity: number;
  suggestedWeightGrams: number;
  isManualWeight: boolean;
}

const CATEGORY_GROUPS: Record<string, string[]> = {
  'CEREALS': ['cereais', 'pães', 'paes', 'massas', 'arroz', 'farinha', 'biscoito', 'milho', 'aveia', 'granola', 'torrada', 'tapioca', 'farináceos', 'panificação'],
  'TUBERS': ['tubérculos', 'batata', 'mandioca', 'cará', 'inhame', 'mandioquinha', 'raízes'],
  'FRUITS': ['frutas', 'fruta', 'suco de fruta', 'polpa'],
  'LEGUMES': ['leguminosas', 'feijão', 'feijao', 'grão', 'soja', 'lentilha', 'ervilha', 'grão-de-bico', 'feijões'],
  'PROTEINS': ['carnes', 'pescados', 'peixes', 'aves', 'frango', 'ovos', 'carne', 'suínos', 'bovinos', 'miúdos', 'vísceras'],
  'DAIRY': ['laticínios', 'queijos', 'leite', 'iogurte', 'queijo'],
  'VEGETABLES': ['vegetais', 'verduras', 'hortaliças', 'legumes', 'folhas', 'hortícolas'],
  'FATS': ['óleos', 'gorduras', 'oleaginosas', 'azeite', 'manteiga', 'margarina', 'castanha', 'amendoim', 'sementes', 'lípidos']
};

function getGroup(category: string): string[] {
  const cat = category.toLowerCase();
  for (const group of Object.values(CATEGORY_GROUPS)) {
    if (group.some(term => cat.includes(term))) return group;
  }
  // Tentar match parcial se não encontrou exato
  const fallback = cat.split(/[\s,/-]+/)[0];
  return [fallback];
}

export const SubstitutionService = {
  /**
   * Encontra substitutos e calcula a porção equivalente para bater o referenceKcal.
   */
  findSubstitutes: (originalFoodId: string, referenceKcal: number): SubstitutionSuggestion[] => {
    const original = FoodService.getById(originalFoodId);
    if (!original || referenceKcal <= 0) return [];

    const groupTerms = getGroup(original.category);

    // Busca candidatos: tentamos buscar por cada termo do grupo para ampliar a base
    let allCandidates: FoodItemCanonical[] = [];
    const seenCandidateIds = new Set<string>();

    groupTerms.forEach(term => {
      const results = FoodService.searchByCategory(term);
      results.forEach(cand => {
        if (!seenCandidateIds.has(cand.id)) {
          allCandidates.push(cand);
          seenCandidateIds.add(cand.id);
        }
      });
    });

    const suggestions: SubstitutionSuggestion[] = [];

    allCandidates.forEach(cand => {
      if (cand.id === originalFoodId) return;

      // Match de categoria técnica (já filtrado pelo searchByCategory, mas vamos validar densidade)
      const densityCand = cand.nutrientsPer100g.kcal;
      if (densityCand <= 0) return;

      // --- CÁLCULO DE EQUIVALÊNCIA ---
      const targetGrams = (referenceKcal / densityCand) * 100;

      let bestPortionIdx = 0;
      let bestQuantity = 1;
      let minDiff = Infinity;

      cand.portions.forEach((p, pIdx) => {
        [0.5, 1, 1.5, 2, 3].forEach(q => {
          const currentGrams = p.grams * q;
          const diff = Math.abs(currentGrams - targetGrams);
          if (diff < minDiff) {
            minDiff = diff;
            bestPortionIdx = pIdx;
            bestQuantity = q;
          }
        });
      });

      const weightFromPortion = cand.portions[bestPortionIdx].grams * bestQuantity;
      const diffPct = (Math.abs(weightFromPortion - targetGrams) / targetGrams) * 100;

      suggestions.push({
        food: cand,
        suggestedPortionIdx: diffPct > 15 ? -1 : bestPortionIdx,
        suggestedQuantity: diffPct > 15 ? 1 : bestQuantity,
        suggestedWeightGrams: Math.round(targetGrams),
        isManualWeight: diffPct > 15
      });
    });

    const densityOrig = original.nutrientsPer100g.kcal;

    return suggestions.sort((a, b) => {
      const diffA = Math.abs(a.food.nutrientsPer100g.kcal - densityOrig);
      const diffB = Math.abs(b.food.nutrientsPer100g.kcal - densityOrig);
      return diffA - diffB;
    }).slice(0, 15);
  }
};
