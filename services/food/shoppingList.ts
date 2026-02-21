
import { Meal } from '../../types';
import { FoodService } from './foodCatalog';

export interface ShoppingItem {
  name: string;
  category: string;
  totalGrams: number;
  estimatedUnit?: string;
}

export const ShoppingListService = {
  generate: (meals: Meal[]): Record<string, ShoppingItem[]> => {
    const map: Record<string, ShoppingItem> = {};

    meals.forEach(meal => {
      meal.items.forEach(item => {
        const catalogItem = FoodService.getById(item.foodId);
        // Usa nome do catálogo se disponível para agrupar melhor, senão usa nome do item
        const name = catalogItem ? catalogItem.namePt : item.name;
        const category = catalogItem?.shoppingCategory || "Outros";
        
        // Estima gramas
        let grams = 0;
        if (catalogItem) {
             const savedKcal = item.calculatedCalories || 0;
             const refKcal = catalogItem.nutrientsPer100g.kcal;
             if (refKcal > 0) {
                 grams = (savedKcal / refKcal) * 100;
             }
        } else {
            // Se item manual, tenta inferir se a unidade for 'g'
            if (item.unit === 'g') grams = item.quantity;
            else grams = 0; // Item manual sem gramatura conhecida
        }

        if (!map[name]) {
            map[name] = { name, category, totalGrams: 0 };
        }
        map[name].totalGrams += grams;
      });
    });

    // Agrupar por categoria
    const byCategory: Record<string, ShoppingItem[]> = {};
    Object.values(map).forEach(item => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
    });

    return byCategory;
  }
};
