
import { Meal } from '../../types';
import { FoodService, FoodItemCanonical } from './foodCatalog';

export interface DailyNutrientTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  calcium: number;
  iron: number;
  potassium: number;
  vitaminC: number;
}

export const NutrientCalc = {
  /**
   * Calcula os totais de uma lista de refeições.
   * Recupera dados do catálogo quando available para maior precisão de micros.
   */
  calculateDailyTotals: (meals: Meal[]): DailyNutrientTotals => {
    const totals: DailyNutrientTotals = {
      calories: 0, protein: 0, carbs: 0, fat: 0,
      fiber: 0, sodium: 0, calcium: 0, iron: 0, potassium: 0, vitaminC: 0
    };

    meals.forEach(meal => {
      meal.items.forEach(item => {
        // 1. Macros principais (Sempre confia no item para manter edições manuais)
        totals.calories += Number(item.calculatedCalories) || 0;
        totals.protein += Number(item.calculatedProtein) || 0;
        totals.carbs += Number(item.calculatedCarbs) || 0;
        totals.fat += Number(item.calculatedFat) || 0;

        // 2. Micros (Prioridade: Snapshot > Catálogo > 0)
        if (item.snapshot) {
          // Se o item já tem snapshot (novo fluxo), usa ele diretamente
          totals.fiber += Number(item.snapshot.fiber) || 0;
          totals.sodium += Number(item.snapshot.sodium) || 0;
          totals.calcium += Number(item.snapshot.calcium) || 0;
          totals.iron += Number(item.snapshot.iron) || 0;
          totals.potassium += Number(item.snapshot.potassium) || 0;
          totals.vitaminC += Number(item.snapshot.vitaminC) || 0;
        } else {
          // Fallback legado: Tenta recuperar do catálogo
          const catalogItem = FoodService.getById(item.foodId);
          if (catalogItem) {
            const savedKcal = item.calculatedCalories || 0;
            const refKcal100g = catalogItem.nutrientsPer100g.kcal;

            if (refKcal100g > 0) {
              const ratio = (savedKcal / refKcal100g);
              totals.fiber += (catalogItem.nutrientsPer100g.fiber_g || 0) * ratio;
              totals.sodium += (catalogItem.nutrientsPer100g.sodium_mg || 0) * ratio;
              totals.calcium += (catalogItem.nutrientsPer100g.calcium_mg || 0) * ratio;
              totals.iron += (catalogItem.nutrientsPer100g.iron_mg || 0) * ratio;
              totals.potassium += (catalogItem.nutrientsPer100g.potassium_mg || 0) * ratio;
              totals.vitaminC += (catalogItem.nutrientsPer100g.vitaminC_mg || 0) * ratio;
            }
          }
        }
      });
    });

    // Arredondamentos finais
    return {
      calories: Math.round(totals.calories),
      protein: parseFloat(totals.protein.toFixed(1)),
      carbs: parseFloat(totals.carbs.toFixed(1)),
      fat: parseFloat(totals.fat.toFixed(1)),
      fiber: parseFloat(totals.fiber.toFixed(1)),
      sodium: Math.round(totals.sodium),
      calcium: Math.round(totals.calcium),
      iron: parseFloat(totals.iron.toFixed(1)),
      potassium: Math.round(totals.potassium),
      vitaminC: Math.round(totals.vitaminC)
    };
  }
};
