import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncCreatableSelect from 'react-select/async-creatable';

interface CidOption {
  value: string;
  label: string;
}

interface CidAutocompleteProps {
  selectedPathologies: string[];
  onChange: (pathologies: string[]) => void;
  isManagerMode?: boolean;
}

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

    try {
      // Endpoint publico comum de busca CID10. 
      const response = await axios.get(`https://cid10-api.herokuapp.com/cid10/buscar/${inputValue}`, {
        timeout: 3000
      });
      if (response.data && response.data.length > 0) {
        return response.data.map((item: { codigo: string, nome: string }) => ({
          value: `${item.codigo} - ${item.nome}`,
          label: `${item.codigo} - ${item.nome}`,
        }));
      }
      return [];
    } catch (error) {
      console.error("Erro ao buscar CID10 na API principal", error);
      // Tentar API secundária ou retornar array vazio q o AsyncCreatable cuidará de permitir a digitação livre
      return [];
    }
  };

  const handleChange = (newValue: any) => {
    const options = newValue || []; // Pode ser null se apagar tudo
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
      backgroundColor: isManagerMode ? '#7f1d1d' : '#fee2e2', // red-900 / red-100 to match old visual
      borderRadius: '4px',
      border: `1px solid ${isManagerMode ? '#b91c1c' : '#fecaca'}`,
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: isManagerMode ? '#fca5a5' : '#991b1b', // red-300 / red-800
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
        placeholder="Digite CID ou nome da patologia..."
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < 2
            ? "Digite ao menos 2 letras do CID ou Nome."
            : "Nenhum resultado na API. Tecle Enter para adicionar como texto."
        }
        formatCreateLabel={(inputValue) => `Adicionar a patologia "${inputValue}"`}
      />
      <div className={`mt-1 text-[10px] italic ${isManagerMode ? 'text-gray-400' : 'text-emerald-700 opacity-70'}`}>
        * Sugestão: Busque por código (E11) ou nome. Para texto livre, digite e tecle Enter.
      </div>
    </div>
  );
};
