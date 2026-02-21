
import React, { useState, useEffect } from 'react';
import { User, Clinic, Professional, Role } from '../types';
import { db } from '../services/db';

interface ProfessionalsProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean; 
}

const Professionals: React.FC<ProfessionalsProps> = ({ user, clinic, isManagerMode }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [users, setUsers] = useState<User[]>([]); // State to hold user data
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'PROFESSIONAL' | 'ACCESS'>('PERSONAL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Form State - Expanded
  const initialForm = {
      name: '',
      cpf: '',
      phone: '',
      whatsapp: '',
      address: '',
      cep: '',
      city: '',
      state: '',
      specialty: '',
      registrationNumber: '',
      color: 'bg-blue-200',
      email: '',
      password: '', // Only for creation or update
      role: Role.PROFESSIONAL,
      isActive: true
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchData();
  }, [clinic.id]);

  const fetchData = async () => {
      setLoading(true);
      const profData = await db.getProfessionals(clinic.id);
      const userData = await db.getUsers(clinic.id); // Fetch users to get their roles
      setProfessionals(profData);
      setUsers(userData);
      setLoading(false);
  };

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setFormData(initialForm);
      setActiveTab('PERSONAL');
      setIsModalOpen(true);
  };

  const handleOpenEdit = (prof: Professional) => {
      const userRecord = users.find(u => u.id === prof.userId);
      setEditingId(prof.id);
      setFormData({
          name: prof.name,
          cpf: prof.cpf || '',
          phone: prof.phone || '',
          whatsapp: prof.whatsapp || '',
          address: prof.address || '',
          cep: prof.cep || '',
          city: prof.city || '',
          state: prof.state || '',
          specialty: prof.specialty,
          registrationNumber: prof.registrationNumber,
          color: prof.color,
          email: prof.email,
          password: '', // Don't show existing password
          role: userRecord ? userRecord.role : Role.PROFESSIONAL, // BUG FIX: Load the actual user role
          isActive: prof.isActive
      });
      setActiveTab('PERSONAL');
      setIsModalOpen(true);
  };

  // REFACTORED DELETE: Optimistic Updates + Robust Checks
  const handleDelete = async (id: string | null) => {
      if (!id) return;
      
      // Protection against deleting self
      if (user.professionalId === id) {
          alert("Ação negada: Você não pode excluir seu próprio cadastro enquanto está logado.");
          return;
      }

      if(confirm('ATENÇÃO: A exclusão é irreversível. O acesso do usuário será revogado. Deseja continuar?')) {
          
          // 1. Optimistic Update (Remove from UI immediately)
          const previousState = [...professionals];
          setProfessionals(prev => prev.filter(p => p.id !== id));
          setIsModalOpen(false);

          try {
              // 2. Perform DB Operation
              const result = await db.deleteProfessional(user, id);
              showToast(`Excluído. ${result.reassigned} reagendados, ${result.cancelled} cancelados.`);
              
              // 3. Confirm with real data fetch (optional, but good for sync)
              fetchData(); 
          } catch (e) {
              // 4. Rollback on Error
              console.error(e);
              setProfessionals(previousState);
              alert('Falha ao excluir: ' + e);
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (editingId) {
              await db.updateProfessional(user, editingId, formData);
              showToast('Dados atualizados com sucesso.');
          } else {
              if(!formData.password) {
                  alert("Uma senha inicial é obrigatória para novos profissionais.");
                  return;
              }
              await db.createProfessional(user, formData);
              showToast('Profissional cadastrado com sucesso!');
          }
          setIsModalOpen(false);
          fetchData();
      } catch (e) {
          alert('Erro ao salvar: ' + e);
      }
  };

  const colorOptions = [
      'bg-blue-200', 'bg-green-200', 'bg-red-200', 'bg-yellow-200', 
      'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-teal-200'
  ];

  // RBAC Guard: Only allow access to admins
  if (user.role !== Role.CLINIC_ADMIN && user.role !== Role.SUPER_ADMIN) {
    return (
      <div className={`${isManagerMode ? 'text-gray-100' : 'text-gray-900'} p-8 text-center`}>
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p>Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
            <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50 animate-bounce">
                ✅ {toastMessage}
            </div>
        )}

        <div className="flex justify-between items-center">
            <div>
                <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>Gestão de Profissionais</h1>
                <p className={`mt-1 ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Cadastre a equipe, configure acessos e cores da agenda.</p>
            </div>
            <button 
                onClick={handleOpenCreate}
                className={`px-4 py-2 rounded-md hover:bg-blue-700 font-medium flex items-center gap-2 ${isManagerMode ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}
            >
                <span>+</span> Novo Profissional
            </button>
        </div>

        <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow overflow-hidden rounded-lg`}>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className={`${isManagerMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Profissional</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Registro</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Contato</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Agenda</th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-gray-500'}`}>Ações</th>
                    </tr>
                </thead>
                <tbody className={`${isManagerMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                    {professionals.map(prof => (
                        <tr key={prof.id} className={`${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className={`h-8 w-8 rounded-full ${prof.color} flex items-center justify-center font-bold text-xs border border-gray-300 mr-3`}>
                                        {prof.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold ${isManagerMode ? 'text-white' : 'text-gray-900'}`}>{prof.name}</div>
                                        <div className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>{prof.specialty}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono px-2 rounded w-fit text-gray-500 bg-gray-50">{prof.registrationNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-xs ${isManagerMode ? 'text-gray-200' : 'text-gray-900'}`}>{prof.email}</div>
                                <div className={`text-xs ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {prof.phone ? `Cel: ${prof.phone}` : ''}
                                </div>
                                {prof.whatsapp && <div className={`text-xs font-bold ${isManagerMode ? 'text-emerald-400' : 'text-green-600'}`}>Zap: {prof.whatsapp}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${prof.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {prof.isActive ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleOpenEdit(prof)} className={`${isManagerMode ? 'text-indigo-400 hover:text-indigo-200' : 'text-blue-600 hover:text-blue-900'} mr-4`}>Editar</button>
                                <button onClick={() => handleDelete(prof.id)} className={`${isManagerMode ? 'text-red-400 hover:text-red-200' : 'text-red-600 hover:text-red-900'} font-bold`}>Excluir</button>
                            </td>
                        </tr>
                    ))}
                    {professionals.length === 0 && (
                        <tr>
                            <td colSpan={5} className={`px-6 py-8 text-center italic ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum profissional cadastrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className={`${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
                    {/* Header */}
                    <div className={`px-6 py-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-gray-700 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <h2 className="text-lg font-bold">{editingId ? 'Editar Cadastro' : 'Novo Profissional'}</h2>
                        <button onClick={() => setIsModalOpen(false)} className={`${isManagerMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>✕</button>
                    </div>

                    {/* Tabs */}
                    <div className={`flex border-b ${isManagerMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <button 
                            onClick={() => setActiveTab('PERSONAL')}
                            className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'PERSONAL' ? (isManagerMode ? 'border-b-2 border-indigo-500 text-indigo-400 bg-gray-800' : 'border-b-2 border-blue-600 text-blue-600 bg-blue-50') : (isManagerMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}
                        >
                            1. Dados Pessoais
                        </button>
                        <button 
                            onClick={() => setActiveTab('PROFESSIONAL')}
                            className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'PROFESSIONAL' ? (isManagerMode ? 'border-b-2 border-indigo-500 text-indigo-400 bg-gray-800' : 'border-b-2 border-blue-600 text-blue-600 bg-blue-50') : (isManagerMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}
                        >
                            2. Profissional
                        </button>
                        <button 
                            onClick={() => setActiveTab('ACCESS')}
                            className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'ACCESS' ? (isManagerMode ? 'border-b-2 border-indigo-500 text-indigo-400 bg-gray-800' : 'border-b-2 border-blue-600 text-blue-600 bg-blue-50') : (isManagerMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}
                        >
                            3. Acesso (Login)
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* TAB 1: PERSONAL */}
                        {activeTab === 'PERSONAL' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome Completo *</label>
                                    <input 
                                        type="text" required
                                        className={`mt-1 block w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>CPF</label>
                                        <input 
                                            type="text"
                                            placeholder="000.000.000-00"
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                            value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Telefone / Celular</label>
                                        <input 
                                            type="text"
                                            placeholder="(00) 00000-0000"
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                     <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>WhatsApp (Opcional)</label>
                                        <input 
                                            type="text"
                                            placeholder="(00) 00000-0000"
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                            value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>CEP</label>
                                    <input 
                                        type="text"
                                        placeholder="00000-000"
                                        className={`mt-1 block w-32 border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                        value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Endereço Residencial</label>
                                        <input 
                                            type="text"
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                            value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Cidade</label>
                                            <input 
                                                type="text"
                                                className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                                value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Estado</label>
                                            <input 
                                                type="text"
                                                maxLength={2}
                                                className={`mt-1 block w-full border rounded-md p-2 uppercase ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                                value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: PROFESSIONAL */}
                        {activeTab === 'PROFESSIONAL' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Especialidade *</label>
                                    <input 
                                        type="text" required
                                        placeholder="Ex: Cardiologia, Nutrição..."
                                        className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                        value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Registro Profissional (Conselho) *</label>
                                    <input 
                                        type="text" required
                                        placeholder="Ex: CRM-SP 123456"
                                        className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                        value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Cor na Agenda</label>
                                    <div className={`flex gap-2 flex-wrap p-3 rounded-lg border ${isManagerMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                        {colorOptions.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData({...formData, color: c})}
                                                className={`w-8 h-8 rounded-full border-2 ${c} ${formData.color === c ? (isManagerMode ? 'border-indigo-400 scale-110 shadow-md' : 'border-gray-900 scale-110 shadow-md') : 'border-transparent'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs mt-1 ${isManagerMode ? 'text-gray-400' : 'text-gray-500'}`}>Essa cor será usada para identificar os agendamentos deste profissional.</p>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: ACCESS */}
                        {activeTab === 'ACCESS' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className={`p-4 rounded-md border mb-4 ${isManagerMode ? 'bg-yellow-900 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                                    <h4 className="text-sm font-bold">⚠️ Credenciais de Login</h4>
                                    <p className="text-xs mt-1">
                                        Estes dados permitirão que o profissional acesse o sistema. O e-mail deve ser único.
                                    </p>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>E-mail de Login *</label>
                                    <input 
                                        type="email" required
                                        className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {editingId ? 'Redefinir Senha (deixe em branco para manter)' : 'Senha Inicial *'}
                                    </label>
                                    <input 
                                        type="password"
                                        required={!editingId}
                                        className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Nível de Acesso</label>
                                        <select 
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                            value={formData.role} 
                                            onChange={e => setFormData({...formData, role: e.target.value as Role})}
                                        >
                                            <option value={Role.PROFESSIONAL}>Apenas Profissional (Agenda/Pacientes)</option>
                                            <option value={Role.CLINIC_ADMIN}>Administrador da Clínica</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Status da Conta</label>
                                        <select 
                                            className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                                            value={String(formData.isActive)} // Ensure value is a string
                                            onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                                        >
                                            <option value="true">Ativo</option>
                                            <option value="false">Bloqueado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Footer Buttons */}
                        <div className={`flex justify-between items-center pt-6 border-t mt-6 ${isManagerMode ? 'border-gray-700' : 'border-gray-100'}`}>
                            
                            {/* DELETE BUTTON (Left Aligned for UX) */}
                            <div className="flex items-center">
                                {editingId && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleDelete(editingId)} 
                                        className={`text-sm font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors ${isManagerMode ? 'text-red-400 hover:text-red-200 hover:bg-red-900' : 'text-red-600 hover:text-red-800 hover:bg-red-50'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Excluir
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {activeTab !== 'PERSONAL' && (
                                    <button type="button" onClick={() => {
                                        if(activeTab === 'ACCESS') setActiveTab('PROFESSIONAL');
                                        if(activeTab === 'PROFESSIONAL') setActiveTab('PERSONAL');
                                    }} className={`${isManagerMode ? 'text-gray-300 hover:underline' : 'text-gray-600 hover:underline'} text-sm mr-2`}>Voltar</button>
                                )}

                                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancelar</button>
                                {activeTab === 'ACCESS' ? (
                                    <button type="submit" className={`px-6 py-2 text-white rounded-md font-medium shadow-sm ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        Salvar Cadastro
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => {
                                        if(activeTab === 'PERSONAL') setActiveTab('PROFESSIONAL');
                                        if(activeTab === 'PROFESSIONAL') setActiveTab('ACCESS');
                                    }} className={`px-6 py-2 text-white rounded-md font-medium ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-900 hover:bg-black'}`}>
                                        Próximo &rarr;
                                    </button>
                                )}
                            </div>
                        </div>

                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

// Fix: Change to named export to resolve 'Module has no default export' in App.tsx
export { Professionals };
