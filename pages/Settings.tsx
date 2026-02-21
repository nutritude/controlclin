
import React, { useState, useEffect } from 'react';
import { User, Clinic, AIConfig, ScheduleConfig, Role } from '../types';
import { db } from '../services/db';

interface SettingsProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean; // New prop
}

const Settings: React.FC<SettingsProps> = ({ user, clinic, isManagerMode }) => {
  // Config States
  const [formData, setFormData] = useState<Partial<Clinic>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const loadClinicData = async () => {
      setDataLoaded(false);
      // If user is SUPER_ADMIN, they are editing the main clinic ('c1'), not their session's 'system' clinic.
      // If user is a regular CLINIC_ADMIN, their 'clinic' prop is the correct one to edit.
      const clinicToLoad = user.role === Role.SUPER_ADMIN 
        ? await db.getClinic('c1') 
        : clinic;

      if (clinicToLoad) {
        setFormData({
          ...clinicToLoad,
          aiConfig: clinicToLoad.aiConfig || { personality: 'ANALITICA', focus: 'RETENCAO' },
          scheduleConfig: clinicToLoad.scheduleConfig || { openTime: '08:00', closeTime: '18:00', daysOpen: [1, 2, 3, 4, 5], slotDuration: 30 }
        });
        setLogoPreview(clinicToLoad.logoUrl || null);
      }
      setDataLoaded(true);
    };

    loadClinicData();
  }, [user, clinic]);

  const handleChange = (field: keyof Clinic, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAIChange = (field: keyof AIConfig, value: any) => {
      setFormData(prev => ({
          ...prev,
          aiConfig: {
              ...(prev.aiConfig as AIConfig),
              [field]: value
          }
      }));
  };

  const handleScheduleChange = (field: keyof ScheduleConfig, value: any) => {
      setFormData(prev => ({
          ...prev,
          scheduleConfig: {
              ...(prev.scheduleConfig as ScheduleConfig),
              [field]: value
          }
      }));
  };

  const toggleDay = (dayIndex: number) => {
      const currentDays = formData.scheduleConfig?.daysOpen || [];
      const newDays = currentDays.includes(dayIndex)
          ? currentDays.filter(d => d !== dayIndex)
          : [...currentDays, dayIndex].sort();
      
      handleScheduleChange('daysOpen', newDays);
  };

  // --- IMAGE COMPRESSION UTILITY ---
  // Resizes image to max 300px width/height and uses PNG to preserve TRANSPARENCY.
  // This prevents LocalStorage quota exceeded errors and browser crashes.
  const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  // Calculate new dimensions (Max 300px)
                  const MAX_WIDTH = 300;
                  const MAX_HEIGHT = 300;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                      }
                  } else {
                      if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  
                  if (ctx) {
                      ctx.clearRect(0, 0, width, height); // Ensure canvas is transparent
                      ctx.drawImage(img, 0, 0, width, height);
                      
                      // USE PNG TO SUPPORT TRANSPARENCY
                      // Size is slightly larger than JPEG but usually safe for 300px (50-150KB)
                      const dataUrl = canvas.toDataURL('image/png');
                      resolve(dataUrl);
                  } else {
                      reject(new Error("Canvas context failed"));
                  }
              };
              img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
      });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setUploadError(null);

      if (file) {
          // Basic Type Check
          if (!file.type.startsWith('image/')) {
              setUploadError("Por favor, selecione um arquivo de imagem válido (JPG, PNG).");
              return;
          }

          try {
              // Compress BEFORE setting state to avoid memory crash
              const compressedBase64 = await compressImage(file);
              setLogoPreview(compressedBase64);
              handleChange('logoUrl', compressedBase64);
          } catch (err) {
              console.error("Compression error:", err);
              setUploadError("Erro ao processar imagem. Tente um arquivo menor.");
          }
      }
  };

  const handleRemoveLogo = () => {
      setLogoPreview(null);
      handleChange('logoUrl', null);
  };

  const handleSave = async () => {
      setSaving(true);
      try {
          // 1. Save to Persistent DB
          const updatedClinic = await db.updateClinicSettings(user, clinic.id, formData);
          
          // 2. Manually update session storage for immediate App context update on reload
          // Only update the session storage if the user is not a super admin, to avoid overwriting their 'system' clinic context.
          if (user.role !== Role.SUPER_ADMIN) {
             localStorage.setItem('app_clinic', JSON.stringify(updatedClinic));
          }
          
          alert("Configurações salvas com sucesso!");
          
          // 3. Reload to reflect changes in Layout (Logo, Name, etc.)
          window.location.reload(); 
      } catch (err) {
          console.error(err);
          // Check for Quota Error specifically
          if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
              alert("Erro CRÍTICO: Espaço de armazenamento cheio. O logo não pôde ser salvo. Tente remover o logo atual.");
          } else {
              alert("Erro ao salvar: " + err);
          }
      } finally {
          setSaving(false);
      }
  };

  const handleResetClinic = async () => {
    const confirmation = prompt('Esta é uma ação IRREVERSÍVEL e irá apagar todos os dados desta clínica (pacientes, agendamentos, etc), preservando apenas o administrador. Para confirmar, digite "ZERAR DADOS" no campo abaixo:');
    if (confirmation === 'ZERAR DADOS') {
        setSaving(true);
        try {
            // For SUPER_ADMIN, clinic.id is 'system', but the action should target the actual clinic.
            // In this single-clinic mock, we hardcode 'c1'. In a multi-clinic app, you'd select the target.
            const targetClinicId = 'c1'; 
            await db.resetClinicData(user, targetClinicId);
            alert('Dados da clínica resetados com sucesso! A página será recarregada com os novos dados padrão.');
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Erro ao resetar os dados: ' + err);
        } finally {
            setSaving(false);
        }
    } else {
        alert('Ação cancelada. Os dados não foram alterados.');
    }
  };

  const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // RBAC Guard: Only allow access to admins
  if (user.role !== Role.CLINIC_ADMIN && user.role !== Role.SUPER_ADMIN) {
    return (
      <div className={`${isManagerMode ? 'text-gray-100' : 'text-gray-900'} p-8 text-center`}>
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p>Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }
  
  if (!dataLoaded) {
    return (
        <div className={`p-8 text-center ${isManagerMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Carregando configurações da clínica...
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
            <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>Configurações Gerais</h1>
            <p className={`${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Gerencie a identidade, dados cadastrais e inteligência da sua clínica.</p>
        </div>
        <button 
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 rounded-md shadow hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium ${isManagerMode ? 'bg-indigo-600' : 'bg-blue-600'} text-white`}
        >
            {saving ? 'Salvando...' : 'Salvar Tudo'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: BRANDING & LOGO */}
          <div className="lg:col-span-1 space-y-6">
              <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Identidade Visual</h3>
                  
                  <div className="flex flex-col items-center">
                      <div className={`w-32 h-32 rounded-lg border-2 border-dashed ${uploadError ? 'border-red-300 bg-red-50' : (isManagerMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50')} flex items-center justify-center overflow-hidden relative group cursor-pointer mb-2 transition-all`}>
                          {logoPreview ? (
                              <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                          ) : (
                              <span className={`text-xs text-center px-2 ${isManagerMode ? 'text-gray-400' : 'text-gray-400'}`}>Sem Logo</span>
                          )}
                          
                          <label className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all cursor-pointer">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-bold">Alterar</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                          </label>
                      </div>
                      
                      {uploadError && (
                          <p className="text-xs text-red-600 text-center mb-2 font-medium">{uploadError}</p>
                      )}

                      {logoPreview && (
                          <button 
                              onClick={handleRemoveLogo}
                              className="text-xs text-red-600 hover:text-red-800 underline mb-2"
                          >
                              Remover Logo
                          </button>
                      )}

                      <p className={`text-xs text-center ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Otimização automática ativada.</p>
                  </div>

                  <div className="mt-6">
                      <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome da Clínica</label>
                      <input 
                          type="text" 
                          value={formData.name} 
                          onChange={e => handleChange('name', e.target.value)}
                          className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                      />
                  </div>
                   <div className="mt-4">
                      <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Slug (Link de Acesso)</label>
                      <div className="flex rounded-md shadow-sm mt-1">
                          <span className={`inline-flex items-center px-3 rounded-l-md border border-r-0 text-xs ${isManagerMode ? 'border-gray-600 bg-gray-700 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>
                              .saas.com
                          </span>
                          <input 
                              type="text" 
                              value={formData.slug || ''}
                              onChange={e => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border text-sm ${isManagerMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                          />
                      </div>
                      <p className={`mt-1 text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Apenas letras minúsculas, números e hífens.</p>
                  </div>
              </div>

               <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Presença Digital</h3>
                  <div className="space-y-4">
                      <div>
                          <label className={`block text-xs font-medium ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Website</label>
                          <input 
                              type="text" 
                              placeholder="www.suaclinica.com.br"
                              value={formData.website || ''} 
                              onChange={e => handleChange('website', e.target.value)}
                              className={`mt-1 block w-full border rounded-md py-1.5 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className={`block text-xs font-medium ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Instagram</label>
                          <input 
                              type="text" 
                              placeholder="@suaclinica"
                              value={formData.instagram || ''} 
                              onChange={e => handleChange('instagram', e.target.value)}
                              className={`mt-1 block w-full border rounded-md py-1.5 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className={`block text-xs font-medium ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>LinkedIn</label>
                          <input 
                              type="text" 
                              placeholder="linkedin.com/company/..."
                              value={formData.linkedin || ''} 
                              onChange={e => handleChange('linkedin', e.target.value)}
                              className={`mt-1 block w-full border rounded-md py-1.5 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: MAIN FORMS */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* SECTION: CADASTRAIS */}
              <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Dados Cadastrais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>CNPJ</label>
                          <input 
                              type="text" 
                              value={formData.cnpj || ''} 
                              onChange={e => handleChange('cnpj', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Telefone Principal</label>
                          <input 
                              type="text" 
                              value={formData.phone || ''} 
                              onChange={e => handleChange('phone', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div className="md:col-span-2">
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Endereço Completo</label>
                          <input 
                              type="text" 
                              value={formData.address || ''} 
                              onChange={e => handleChange('address', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Cidade</label>
                          <input 
                              type="text" 
                              value={formData.city || ''} 
                              onChange={e => handleChange('city', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Estado (UF)</label>
                          <input 
                              type="text" 
                              maxLength={2}
                              value={formData.state || ''} 
                              onChange={e => handleChange('state', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm uppercase ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                  </div>
              </div>

              {/* SECTION: AGENDA */}
              <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Configurações da Agenda</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Horário de Abertura</label>
                          <input 
                              type="time" 
                              value={formData.scheduleConfig?.openTime || '08:00'} 
                              onChange={e => handleScheduleChange('openTime', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Horário de Fechamento</label>
                          <input 
                              type="time" 
                              value={formData.scheduleConfig?.closeTime || '18:00'} 
                              onChange={e => handleScheduleChange('closeTime', e.target.value)}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                      </div>
                      <div className="md:col-span-2">
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Dias de Funcionamento</label>
                          <div className="mt-2 flex flex-wrap gap-2">
                              {daysOfWeek.map((day, index) => (
                                  <button
                                      key={index}
                                      type="button"
                                      onClick={() => toggleDay(index)}
                                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                          formData.scheduleConfig?.daysOpen?.includes(index)
                                              ? (isManagerMode ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-blue-600 text-white border-blue-700')
                                              : (isManagerMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200')
                                      }`}
                                  >
                                      {day}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>

              {/* SECTION: AI */}
              <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Inteligência Artificial (Gemini)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Personalidade da IA</label>
                          <select 
                              value={formData.aiConfig?.personality || 'ANALITICA'} 
                              onChange={e => handleAIChange('personality', e.target.value as AIConfig['personality'])}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          >
                              <option value="ANALITICA">Analítica (Formal, Dados)</option>
                              <option value="EMPATICA">Empática (Acolhedora, Humana)</option>
                              <option value="COMERCIAL">Comercial (Foco em Vendas/Serviços)</option>
                          </select>
                      </div>
                      <div>
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Foco Estratégico da IA</label>
                          <select 
                              value={formData.aiConfig?.focus || 'RETENCAO'} 
                              onChange={e => handleAIChange('focus', e.target.value as AIConfig['focus'])}
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          >
                              <option value="RETENCAO">Retenção de Pacientes</option>
                              <option value="FATURAMENTO">Faturamento e Receita</option>
                              <option value="CAPTACAO">Captação de Novos Pacientes</option>
                          </select>
                      </div>
                      <div className="md:col-span-2">
                          <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Prompt Personalizado (Opcional)</label>
                          <textarea 
                              value={formData.aiConfig?.customPrompt || ''} 
                              onChange={e => handleAIChange('customPrompt', e.target.value)}
                              rows={3}
                              placeholder="Adicione instruções específicas para a IA..."
                              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          />
                          <p className={`mt-1 text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Ex: "Sempre direcione pacientes para a Dra. Camila para nutrição."
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* DANGER ZONE - SUPER ADMIN ONLY */}
      {user.role === Role.SUPER_ADMIN && (
          <div className="mt-12 pt-8 border-t border-red-500/30">
              <h3 className="text-lg font-bold text-red-500 uppercase tracking-wide">Zona de Perigo</h3>
              <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg p-6 flex justify-between items-center">
                  <div>
                      <h4 className="font-bold text-white text-lg">Resetar Dados da Clínica</h4>
                      <p className="text-sm text-red-300 mt-1 max-w-xl">
                          Esta ação irá apagar permanentemente todos os pacientes, agendamentos, exames, alertas e profissionais (exceto o administrador principal) desta clínica. A clínica será revertida para um estado inicial em branco, pronta para uma nova configuração. <strong>Esta ação não pode ser desfeita.</strong>
                      </p>
                  </div>
                  <button
                      onClick={handleResetClinic}
                      disabled={saving}
                      className="bg-red-600 text-white font-bold px-5 py-3 rounded-md hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      Zerar Dados Agora
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

// Fix: Change to named export to resolve 'Module has no default export' in App.tsx
export { Settings };
