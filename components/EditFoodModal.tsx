import React, { useState, useEffect } from 'react';
import { MealItem } from '../types';
import { FoodService, FoodItemCanonical } from '../services/food/foodCatalog';

interface EditFoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (updatedItem: MealItem) => void;
    item: MealItem;
    isManagerMode: boolean;
}

const EditFoodModal: React.FC<EditFoodModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    item,
    isManagerMode
}) => {
    const [quantityMultiplier, setQuantityMultiplier] = useState(item.quantity);
    const [selectedPortionIndex, setSelectedPortionIndex] = useState(0);
    const [customPortionValue, setCustomPortionValue] = useState('');
    const [foodData, setFoodData] = useState<FoodItemCanonical | null>(null);
    const [customName, setCustomName] = useState(item.customName || item.name);

    useEffect(() => {
        if (isOpen && item) {
            setQuantityMultiplier(item.quantity);
            setCustomName(item.customName || item.name);
            // Tentar recuperar dados do alimento para exibir porções
            const food = FoodService.getById(item.foodId);
            if (food) {
                setFoodData(food);
                // Tentar inferir qual porção era
                const pIdx = food.portions.findIndex(p => p.label === item.unit);
                if (pIdx >= 0) {
                    setSelectedPortionIndex(pIdx);
                    setCustomPortionValue('');
                } else {
                    const numericPart = parseFloat(item.unit.replace(/[^\d.]/g, ''));
                    if (!isNaN(numericPart)) {
                        setSelectedPortionIndex(-1);
                        setCustomPortionValue(numericPart.toString());
                    }
                }
            }
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const getUnidade = () => {
        if (!foodData) return 'g';
        const liquidos = ['leite', 'suco', 'bebida', 'água', 'chá', 'café', 'vitamina', 'smoothie', 'shake', 'iogurte líquido', 'caldo', 'sopa', 'refrigerante', 'achocolatado', 'oleo', 'azeite', 'vinagre'];
        const nome = foodData.namePt.toLowerCase();
        if (liquidos.some(l => nome.includes(l))) return 'mL';
        return 'g';
    };

    const calculateTotals = () => {
        if (!foodData) return null;

        let ratio = 1;
        if (selectedPortionIndex === -1 && customPortionValue) {
            ratio = (parseFloat(customPortionValue) * quantityMultiplier) / 100;
        } else {
            const portion = foodData.portions[selectedPortionIndex] || foodData.portions[0];
            ratio = (portion.grams * quantityMultiplier) / 100;
        }

        const nut = foodData.nutrientsPer100g;
        return {
            kcal: Math.round(nut.kcal * ratio) || 0,
            protein: parseFloat((nut.protein_g * ratio).toFixed(1)) || 0,
            carbs: parseFloat((nut.carb_g * ratio).toFixed(1)) || 0,
            fat: parseFloat((nut.fat_g * ratio).toFixed(1)) || 0,
            snapshot: {
                fiber: (nut.fiber_g || 0) * ratio,
                sodium: (nut.sodium_mg || 0) * ratio,
                calcium: (nut.calcium_mg || 0) * ratio,
                iron: (nut.iron_mg || 0) * ratio,
                potassium: (nut.potassium_mg || 0) * ratio,
                vitaminC: (nut.vitaminC_mg || 0) * ratio
            }
        };
    };

    const handleConfirm = () => {
        const totals = calculateTotals();
        if (!totals) {
            onConfirm({
                ...item,
                quantity: quantityMultiplier,
                customName: customName
            });
        } else {
            const unitLabel = selectedPortionIndex === -1
                ? `${customPortionValue}${getUnidade()}`
                : foodData!.portions[selectedPortionIndex].label;

            onConfirm({
                ...item,
                quantity: quantityMultiplier,
                unit: unitLabel as any,
                calculatedCalories: totals.kcal,
                calculatedProtein: totals.protein,
                calculatedCarbs: totals.carbs,
                calculatedFat: totals.fat,
                snapshot: totals.snapshot,
                customName: customName
            });
        }
        onClose();
    };

    const preview = calculateTotals();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-md p-6`}>
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Editar Item</h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold block mb-1 text-emerald-700 uppercase tracking-wider">Nome Comercial (Impressão)</label>
                        <input
                            type="text"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            placeholder="Ex: Café Expresso (sem termos técnicos)"
                            className={`w-full p-2 border rounded text-sm font-medium ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-emerald-300 focus:ring-2 focus:ring-emerald-500'}`}
                        />
                        <p className="text-[10px] text-gray-500 mt-1 italic">Este nome aparecerá no PDF e relatórios para o paciente.</p>
                    </div>

                    <div className="text-[10px] text-gray-400 uppercase font-bold">Dados Originais: {item.name}</div>

                    {foodData && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold block mb-1">Porção</label>
                                <select
                                    value={selectedPortionIndex}
                                    onChange={e => {
                                        setSelectedPortionIndex(parseInt(e.target.value));
                                        setCustomPortionValue('');
                                    }}
                                    className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white'}`}
                                >
                                    {foodData.portions.map((p, i) => <option key={i} value={i}>{p.label} ({p.grams}g)</option>)}
                                    <option value="-1">Outra (digitar)</option>
                                </select>
                            </div>
                            {selectedPortionIndex === -1 && (
                                <div>
                                    <label className="text-xs font-bold block mb-1">Peso (g/mL)</label>
                                    <input
                                        type="number"
                                        value={customPortionValue}
                                        onChange={e => setCustomPortionValue(e.target.value)}
                                        className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white'}`}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold block mb-1">Quantidade</label>
                        <input
                            type="number" step="0.1"
                            value={quantityMultiplier}
                            onChange={e => setQuantityMultiplier(parseFloat(e.target.value))}
                            className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-white'}`}
                        />
                    </div>

                    {preview && (
                        <div className={`p-4 rounded-lg ${isManagerMode ? 'bg-gray-900' : 'bg-slate-50'} border border-slate-200`}>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div><div className="text-[10px] text-gray-400">Kcal</div><div className="font-bold">{preview.kcal}</div></div>
                                <div><div className="text-[10px] text-gray-400">P</div><div className="font-bold text-blue-500">{preview.protein}</div></div>
                                <div><div className="text-[10px] text-gray-400">C</div><div className="font-bold text-green-600">{preview.carbs}</div></div>
                                <div><div className="text-[10px] text-gray-400">G</div><div className="font-bold text-yellow-600">{preview.fat}</div></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded">Cancelar</button>
                    <button onClick={handleConfirm} className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold shadow-sm">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export default EditFoodModal;
