import React, { useState } from 'react';
import { FoodService, FoodItemCanonical, Portion } from '../services/food/foodCatalog';
import { Icons } from '../constants';

interface AddFoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (item: any) => void;
    isManagerMode: boolean;
    editingItem?: any;
    protocol?: string;
}

const AddFoodModal: React.FC<AddFoodModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isManagerMode,
    editingItem,
    protocol
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodItemCanonical[]>([]);
    const [selectedFood, setSelectedFood] = useState<FoodItemCanonical | null>(null);
    const [selectedPortionIndex, setSelectedPortionIndex] = useState(0);
    const [customPortionValue, setCustomPortionValue] = useState('');
    const [quantityMultiplier, setQuantityMultiplier] = useState(1);

    // Modo item manual - CAMPOS NUTRICIONAIS
    const [isCustomItemMode, setIsCustomItemMode] = useState(false);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemQty, setCustomItemQty] = useState('1');
    const [customItemUnit, setCustomItemUnit] = useState('g');
    const [customKcal100, setCustomKcal100] = useState('');
    const [customProtein100, setCustomProtein100] = useState('');
    const [customCarbs100, setCustomCarbs100] = useState('');
    const [customFat100, setCustomFat100] = useState('');
    const [customPortionLabel, setCustomPortionLabel] = useState('');
    const [customPortionGrams, setCustomPortionGrams] = useState('');

    if (!isOpen) return null;

    const handleSearch = (q: string) => {
        setSearchQuery(q);
        if (q.length > 1) {
            const results = FoodService.search(q, protocol);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectFood = (food: FoodItemCanonical) => {
        setSelectedFood(food);
        setSelectedPortionIndex(0);
        setCustomPortionValue('');
        setQuantityMultiplier(1);
    };

    const getUnidade = (alimento: FoodItemCanonical) => {
        const liquidos = ['leite', 'suco', 'bebida', 'água', 'chá', 'café', 'vitamina', 'smoothie', 'shake', 'iogurte líquido', 'caldo', 'sopa', 'refrigerante', 'achocolatado', 'oleo', 'azeite', 'vinagre'];
        const nome = alimento.namePt.toLowerCase();
        if (liquidos.some(l => nome.includes(l))) return 'mL';
        return 'g';
    };

    const calculateTotals = () => {
        if (!selectedFood) return null;

        let ratio = 1;
        if (selectedPortionIndex === -1 && customPortionValue) {
            ratio = (parseFloat(customPortionValue) * quantityMultiplier) / 100;
        } else {
            const portion = selectedFood.portions[selectedPortionIndex] || selectedFood.portions[0];
            ratio = (portion.grams * quantityMultiplier) / 100;
        }

        const nut = selectedFood.nutrientsPer100g;
        return {
            kcal: Math.round(nut.kcal * ratio) || 0,
            protein: parseFloat((nut.protein_g * ratio).toFixed(1)) || 0,
            carbs: parseFloat((nut.carb_g * ratio).toFixed(1)) || 0,
            fat: parseFloat((nut.fat_g * ratio).toFixed(1)) || 0,
            snapshot: {
                // Armazenar outros micros se disponíveis
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
        if (isCustomItemMode) {
            if (!customItemName.trim()) return;
            const qty = parseFloat(customItemQty) || 1;
            const kcal100 = parseFloat(customKcal100) || 0;
            const prot100 = parseFloat(customProtein100) || 0;
            const carb100 = parseFloat(customCarbs100) || 0;
            const fat100 = parseFloat(customFat100) || 0;
            const portGrams = parseFloat(customPortionGrams) || 100;

            // Se o profissional definiu uma porção, calcula proporcionalmente
            const ratio = (portGrams * qty) / 100;

            onConfirm({
                foodId: `custom-${Date.now()}`,
                name: customItemName,
                quantity: qty,
                unit: customPortionLabel || `${portGrams}${customItemUnit === 'ml' ? 'mL' : 'g'}`,
                calculatedCalories: Math.round(kcal100 * ratio),
                calculatedProtein: parseFloat((prot100 * ratio).toFixed(1)),
                calculatedCarbs: parseFloat((carb100 * ratio).toFixed(1)),
                calculatedFat: parseFloat((fat100 * ratio).toFixed(1)),
                manualNutrition: {
                    kcalPer100g: kcal100,
                    proteinPer100g: prot100,
                    carbsPer100g: carb100,
                    fatPer100g: fat100,
                    portionLabel: customPortionLabel || undefined,
                    portionGrams: portGrams
                }
            });
        } else if (selectedFood) {
            const totals = calculateTotals();
            if (!totals) return;

            const unitLabel = selectedPortionIndex === -1
                ? `${customPortionValue}${getUnidade(selectedFood)}`
                : selectedFood.portions[selectedPortionIndex].label;

            onConfirm({
                foodId: selectedFood.id, // Para legado
                uid: selectedFood.id.includes('-') ? selectedFood.id : undefined, // UUID v5 do científico
                name: selectedFood.namePt,
                quantity: quantityMultiplier,
                unit: unitLabel,
                calculatedCalories: totals.kcal,
                calculatedProtein: totals.protein,
                calculatedCarbs: totals.carbs,
                calculatedFat: totals.fat,
                snapshot: totals.snapshot
            });
        }
        onClose();
        // Reset state
        setSearchQuery('');
        setSearchResults([]);
        setSelectedFood(null);
        setIsCustomItemMode(false);
    };

    const preview = calculateTotals();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className={`${isManagerMode ? 'bg-white text-slate-800 border-blue-200' : 'bg-white text-gray-900'} rounded-lg shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col`}>
                <h3 className="text-lg font-bold mb-4 border-b pb-2">
                    {editingItem ? 'Editar Alimento' : 'Adicionar Alimento'}
                </h3>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {!selectedFood && !isCustomItemMode && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                autoFocus
                                className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-white border-blue-300 text-slate-800' : 'bg-white'}`}
                                placeholder="Buscar no catálogo (ex: Arroz, Frango)..."
                                value={searchQuery}
                                onChange={e => handleSearch(e.target.value)}
                            />
                            <div className="space-y-2">
                                {searchResults.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectFood(item)}
                                        className={`w-full text-left p-2 rounded border flex justify-between items-center ${isManagerMode ? 'hover:bg-blue-50 border-blue-200 bg-white' : 'hover:bg-gray-50 border-gray-100'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.namePt}</span>
                                            <span className="text-[10px] text-gray-400 capitalize">{item.category}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono">{item.nutrientsPer100g.kcal} kcal/100g</span>
                                    </button>
                                ))}
                                {searchResults.length === 0 && searchQuery.length > 2 && (
                                    <p className="text-sm text-center text-gray-500 py-4">Nenhum resultado encontrado.</p>
                                )}
                            </div>
                            <button onClick={() => setIsCustomItemMode(true)} className="text-xs text-blue-500 w-full mt-2 hover:underline">
                                ➕ Não encontrou? Usar modo manual (item livre)
                            </button>
                        </div>
                    )}

                    {selectedFood && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex justify-between items-start">
                                <div className="font-bold text-lg text-emerald-600">{selectedFood.namePt}</div>
                                <button onClick={() => setSelectedFood(null)} className="text-xs text-blue-500 hover:underline">Alterar alimento</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold block mb-1">Porção Sugerida</label>
                                    <select
                                        value={selectedPortionIndex}
                                        onChange={e => {
                                            setSelectedPortionIndex(parseInt(e.target.value));
                                            setCustomPortionValue('');
                                        }}
                                        disabled={!!customPortionValue}
                                        className={`w-full p-2 border rounded text-sm ${isManagerMode ? 'bg-white border-blue-300 text-slate-800' : 'bg-white'} disabled:opacity-50`}
                                    >
                                        {selectedFood.portions.map((p, i) => <option key={i} value={i}>{p.label} ({p.grams}g)</option>)}
                                        <option value="-1" disabled={!customPortionValue}>-- Outra quantidade --</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold block mb-1">Peso Direto (g/mL)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" min="1"
                                            value={customPortionValue}
                                            placeholder="Ex: 150"
                                            onChange={e => {
                                                setCustomPortionValue(e.target.value);
                                                if (e.target.value) setSelectedPortionIndex(-1);
                                                else setSelectedPortionIndex(0);
                                            }}
                                            className={`flex-1 p-2 border rounded text-sm ${isManagerMode ? 'bg-white border-blue-300 text-slate-800' : 'bg-white'}`}
                                        />
                                        <span className="text-xs text-gray-500 font-bold">{getUnidade(selectedFood)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold block mb-1">Quantidade (Multiplicador)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range" min="0.5" max="5" step="0.5"
                                        value={quantityMultiplier}
                                        onChange={e => setQuantityMultiplier(parseFloat(e.target.value))}
                                        className="flex-1 accent-emerald-500"
                                    />
                                    <input
                                        type="number" step="0.1"
                                        value={quantityMultiplier}
                                        onChange={e => setQuantityMultiplier(parseFloat(e.target.value))}
                                        className={`w-16 p-1 text-center border rounded text-sm ${isManagerMode ? 'bg-white border-blue-300 text-slate-800' : 'bg-white'}`}
                                    />
                                </div>
                            </div>

                            {preview && (
                                <div className={`p-4 rounded-lg border ${isManagerMode ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">Calculado para este item:</div>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div><div className="text-[10px] text-gray-400">Kcal</div><div className="font-bold text-lg">{preview.kcal}</div></div>
                                        <div><div className="text-[10px] text-gray-400">P (g)</div><div className="font-bold text-lg text-blue-500">{preview.protein}</div></div>
                                        <div><div className="text-[10px] text-gray-400">C (g)</div><div className="font-bold text-lg text-green-600">{preview.carbs}</div></div>
                                        <div><div className="text-[10px] text-gray-400">G (g)</div><div className="font-bold text-lg text-yellow-600">{preview.fat}</div></div>
                                    </div>
                                </div>
                            )}

                            <div className="text-[10px] text-gray-400 italic text-center">
                                Os valores nutricionais são baseados em dados científicos (TACO/TBCA) e podem variar conforme o preparo.
                            </div>
                        </div>
                    )}

                    {isCustomItemMode && (
                        <div className="space-y-4 animate-slideIn">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-blue-500">🧪 Alimento Manual (Não Encontrado)</h4>
                                <button onClick={() => setIsCustomItemMode(false)} className="text-xs text-gray-500 hover:underline">Voltar para busca</button>
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">Nome do Alimento</label>
                                <input placeholder="Ex: Whey Protein Gold Standard" value={customItemName} onChange={e => setCustomItemName(e.target.value)} className={`w-full p-2 border rounded ${isManagerMode ? 'bg-white border-blue-300 text-slate-800' : 'bg-white'}`} />
                            </div>

                            <div className={`p-3 rounded-lg border ${isManagerMode ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">📊 Tabela Nutricional (por 100g/100mL)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Kcal</label>
                                        <input type="number" step="0.1" placeholder="Ex: 375" value={customKcal100} onChange={e => setCustomKcal100(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Proteína (g)</label>
                                        <input type="number" step="0.1" placeholder="Ex: 80" value={customProtein100} onChange={e => setCustomProtein100(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Carboidrato (g)</label>
                                        <input type="number" step="0.1" placeholder="Ex: 6.7" value={customCarbs100} onChange={e => setCustomCarbs100(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Gordura (g)</label>
                                        <input type="number" step="0.1" placeholder="Ex: 3.3" value={customFat100} onChange={e => setCustomFat100(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                </div>
                            </div>

                            <div className={`p-3 rounded-lg border ${isManagerMode ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">📐 Porcionamento</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Qtd</label>
                                        <input type="number" min="0.5" step="0.5" value={customItemQty} onChange={e => setCustomItemQty(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Rótulo da Porção</label>
                                        <input placeholder="Ex: 1 scoop" value={customPortionLabel} onChange={e => setCustomPortionLabel(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-600">Peso (g/mL)</label>
                                        <input type="number" placeholder="30" value={customPortionGrams} onChange={e => setCustomPortionGrams(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white" />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="text-[10px] font-bold text-gray-600">Unidade base</label>
                                    <select value={customItemUnit} onChange={e => setCustomItemUnit(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white mt-1">
                                        <option value="g">g (gramas)</option>
                                        <option value="ml">mL (mililitros)</option>
                                        <option value="un">un (unidade)</option>
                                        <option value="sc">sc (scoop)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Preview calculado para manual */}
                            {(parseFloat(customKcal100) > 0 || parseFloat(customProtein100) > 0) && (
                                <div className={`p-3 rounded-lg border ${isManagerMode ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">Pré-visualização (calculado):</div>
                                    {(() => {
                                        const qty = parseFloat(customItemQty) || 1;
                                        const portG = parseFloat(customPortionGrams) || 100;
                                        const ratio = (portG * qty) / 100;
                                        return (
                                            <div className="grid grid-cols-4 gap-2 text-center">
                                                <div><div className="text-[10px] text-gray-400">Kcal</div><div className="font-bold text-lg">{Math.round((parseFloat(customKcal100) || 0) * ratio)}</div></div>
                                                <div><div className="text-[10px] text-gray-400">P (g)</div><div className="font-bold text-lg text-blue-500">{((parseFloat(customProtein100) || 0) * ratio).toFixed(1)}</div></div>
                                                <div><div className="text-[10px] text-gray-400">C (g)</div><div className="font-bold text-lg text-green-600">{((parseFloat(customCarbs100) || 0) * ratio).toFixed(1)}</div></div>
                                                <div><div className="text-[10px] text-gray-400">G (g)</div><div className="font-bold text-lg text-yellow-600">{((parseFloat(customFat100) || 0) * ratio).toFixed(1)}</div></div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <p className="text-[10px] text-emerald-600 italic text-center">✅ Preencha os dados nutricionais do rótulo para que os cálculos sejam validados.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 border rounded text-sm font-medium ${isManagerMode ? 'border-blue-200 hover:bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={(selectedPortionIndex === -1 && !customPortionValue) && !isCustomItemMode}
                        className={`px-6 py-2 bg-emerald-600 text-white rounded text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {editingItem ? 'Salvar Edição' : 'Adicionar ao Plano'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddFoodModal;
