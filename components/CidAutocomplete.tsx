import React, { useState, useEffect } from 'react';
import AsyncCreatableSelect from 'react-select/async-creatable';
import { COMMON_CIDS } from '../constants/commonCIDs';

interface CidOption {
  value: string;
  label: string;
}

interface CidItem {
  codigo: string;
  nome: string;
}

interface CidAutocompleteProps {
  selectedPathologies: string[];
  onChange: (pathologies: string[]) => void;
  isManagerMode?: boolean;
}

let fullCidCache: CidItem[] | null = null;

export const CidAutocomplete: React.FC<CidAutocompleteProps> = ({
  selectedPathologies = [],
  onChange,
  isManagerMode = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<CidOption[]>([]);

  useEffect(() => {
    const initialOptions = selectedPathologies.map((p) => ({
      value: p,
      label: p,
    }));
    setSelectedOptions(initialOptions);
  }, [selectedPathologies]);

  const loadOptions = async (inputValue: string): Promise<CidOption[]> => {
    if (!inputValue || inputValue.length < 2) return [];

    const lowerInput = inputValue.toLowerCase();

    try {
      if (!fullCidCache) {
        const response = await fetch('/cid10.json');
        if (response.ok) {
          fullCidCache = await response.json();
        }
      }

      if (fullCidCache) {
        const filtered = fullCidCache.filter(
          item => item.codigo.toLowerCase().includes(lowerInput) ||
            item.nome.toLowerCase().includes(lowerInput)
        ).slice(0, 100); // Limit results for performance

        return filtered.map(item => ({
          value: `${item.codigo} - ${item.nome}`,
          label: `${item.codigo} - ${item.nome}`,
        }));
      }
    } catch (err) {
      console.error("Failed to load full CID dataset", err);
    }

    // Fallback search in COMMON_CIDS if full set is not available
    const filteredCommon = COMMON_CIDS.filter(
      item => item.codigo.toLowerCase().includes(lowerInput) ||
        item.nome.toLowerCase().includes(lowerInput)
    );

    return filteredCommon.map(item => ({
      value: `${item.codigo} - ${item.nome}`,
      label: `${item.codigo} - ${item.nome}`,
    }));
  };

  const handleChange = (newValue: any) => {
    const options = newValue || [];
    setSelectedOptions(options);
    onChange(options.map((opt: CidOption) => opt.value));
  };

  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: isManagerMode ? '#374151' : '#ffffff',
      borderColor: isManagerMode ? '#4b5563' : '#6ee7b7',
      color: isManagerMode ? '#f3f4f6' : '#064e3b',
      boxShadow: state.isFocused ? (isManagerMode ? '0 0 0 1px #818cf8' : '0 0 0 1px #10b981') : 'none',
      "&:hover": {
        borderColor: isManagerMode ? '#6b7280' : '#10b981'
      }
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: isManagerMode ? '#1f2937' : '#ffffff',
      zIndex: 9999
    }),
    menuList: (base: any) => ({
      ...base,
      maxHeight: '250px'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused
        ? (isManagerMode ? '#374151' : '#d1fae5')
        : (isManagerMode ? '#1f2937' : '#ffffff'),
      color: state.isFocused ? (isManagerMode ? '#f3f4f6' : '#064e3b') : (isManagerMode ? '#d1d5db' : '#374151'),
      "&:active": {
        backgroundColor: isManagerMode ? '#4b5563' : '#a7f3d0'
      }
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: isManagerMode ? '#7f1d1d' : '#fee2e2',
      borderRadius: '4px',
      border: `1px solid ${isManagerMode ? '#b91c1c' : '#fecaca'}`,
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: isManagerMode ? '#fca5a5' : '#991b1b',
      fontWeight: 'bold',
      fontSize: '0.875rem'
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: isManagerMode ? '#fca5a5' : '#991b1b',
      ':hover': {
        backgroundColor: isManagerMode ? '#991b1b' : '#fecaca',
        color: isManagerMode ? '#fef2f2' : '#7f1d1d',
      },
    }),
    input: (base: any) => ({
      ...base,
      color: isManagerMode ? '#f3f4f6' : '#064e3b',
    })
  };

  return (
    <div className="w-full">
      <AsyncCreatableSelect
        isMulti
        cacheOptions
        defaultOptions={false}
        loadOptions={loadOptions}
        value={selectedOptions}
        onChange={handleChange}
        styles={customStyles}
        placeholder="Busque por CID ou Nome da Patologia (Ex: Cabeça, SOP, E11, Intestino)..."
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < 2
            ? "Digite ao menos 2 letras do CID ou Nome."
            : `Nenhum resultado oficial para "${inputValue}". Tecle Enter para registrar como termo livre.`
        }
        formatCreateLabel={(inputValue) => `Registrar patologia personalizada "${inputValue}"`}
      />
      <div className={`mt-1 text-[10px] italic ${isManagerMode ? 'text-gray-400' : 'text-emerald-700 opacity-70'}`}>
        * Você pode buscar CIDs comuns ou digitar qualquer texto e teclar Enter para registrar livremente.
      </div>
    </div>
  );
};
