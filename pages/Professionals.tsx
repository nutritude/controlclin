
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
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null); // Custom confirm modal

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

    const fetchAddressByCep = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro || prev.address,
                        city: data.localidade || prev.city,
                        state: data.uf || prev.state,
                    }));
                }
            } catch (err) {
                console.error("Erro ao buscar CEP:", err);
            }
        }
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

    const [reassignToId, setReassignToId] = useState<string>('none');

    // REFACTORED DELETE: Custom Confirm Modal + Reassignment + Optimistic Updates
    const requestDelete = (id: string | null) => {
        if (!id) return;
        // Protection against deleting self
        if (user.professionalId === id) {
            showToast('⛔ Ação negada: Você não pode excluir seu próprio cadastro.');
            return;
        }
        setDeleteConfirmId(id);
        setReassignToId('none'); // Reset reassignment logic
    };

    const confirmDelete = async () => {
        const id = deleteConfirmId;
        if (!id) return;
        
        const professionalToDelete = professionals.find(p => p.id === id);
        if (!professionalToDelete) return;

        setDeleteConfirmId(null);

        // 1. Optimistic Update (Remove from UI immediately)
        const previousState = [...professionals];
        setProfessionals(prev => prev.filter(p => p.id !== id));
        setIsModalOpen(false);

        try {
            // 2. Perform DB Operation with Reassignment
            const result = await db.deleteProfessional(user, id, reassignToId);
            showToast(`✅ ${professionalToDelete.name} removido. ${result.reassigned} pacientes remanejados e ${result.cancelled} agendamentos cancelados.`);

            // 3. Confirm with real data fetch
            fetchData();
        } catch (e) {
            // 4. Rollback on Error
            console.error(e);
            setProfessionals(previousState);
            showToast('❌ Falha ao excluir: ' + e);
        }
    };

    // ... (rendering remains similar but with redistributed logic in the modal)

    // Filter available professionals for reassignment (exclude the one being deleted)
    const availableForReassignment = professionals.filter(p => p.id !== deleteConfirmId);

    // [...]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await db.updateProfessional(user, editingId, formData);
                showToast('Dados atualizados com sucesso.');
            } else {
                if (!formData.password) {
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
            <div className={`${isManagerMode ? 'text-blue-900' : 'text-gray-900'} p-8 text-center`}>
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
                    <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-blue-900' : 'text-gray-900'}`}>Gestão de Profissionais</h1>
                    <p className={`mt-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-500'}`}>Cadastre a equipe, configure acessos e cores da agenda.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className={`px-4 py-2 rounded-md hover:bg-blue-700 font-medium flex items-center gap-2 ${isManagerMode ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}
                >
                    <span>+</span> Novo Profissional
                </button>
            </div>

            <div className={`${isManagerMode ? 'bg-white border-blue-100' : 'bg-white border-gray-200'} shadow overflow-hidden rounded-lg`}>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isManagerMode ? 'bg-blue-50/50 border-b border-blue-100' : 'bg-gray-50'}`}>
                        <tr>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-gray-500'}`}>Profissional</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-gray-500'}`}>Registro</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-gray-500'}`}>Contato</th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-gray-500'}`}>Agenda</th>
                            <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-gray-500'}`}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`${isManagerMode ? 'bg-white divide-blue-50' : 'bg-white divide-gray-200'}`}>
                        {professionals.map(prof => (
                            <tr key={prof.id} className={`${isManagerMode ? 'hover:bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className={`h-8 w-8 rounded-full ${prof.color} flex items-center justify-center font-bold text-xs border border-gray-300 mr-3 shadow-inner`}>
                                            {prof.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className={`text-sm font-bold ${isManagerMode ? 'text-blue-900' : 'text-gray-900'}`}>{prof.name}</div>
                                            <div className={`text-xs ${isManagerMode ? 'text-blue-600' : 'text-gray-500'}`}>{prof.specialty}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono px-2 rounded w-fit ${isManagerMode ? 'text-blue-800 bg-blue-50/50' : 'text-gray-500 bg-gray-50'}`}>{prof.registrationNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-xs ${isManagerMode ? 'text-slate-700' : 'text-gray-900'}`}>{prof.email}</div>
                                    <div className={`text-xs ${isManagerMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                        {prof.phone ? `Cel: ${prof.phone}` : ''}
                                    </div>
                                    {prof.whatsapp && <div className={`text-xs font-bold ${isManagerMode ? 'text-blue-600' : 'text-green-600'}`}>Zap: {prof.whatsapp}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${prof.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {prof.isActive ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenEdit(prof)} className={`${isManagerMode ? 'text-indigo-400 hover:text-indigo-200' : 'text-blue-600 hover:text-blue-900'} mr-4`}>Editar</button>
                                    <button onClick={() => requestDelete(prof.id)} className={`${isManagerMode ? 'text-red-400 hover:text-red-200' : 'text-red-600 hover:text-red-900'} font-bold`}>Excluir</button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm p-4">
                    <div className={`${isManagerMode ? 'bg-white text-slate-800' : 'bg-white text-gray-900'} rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-blue-100`}>
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isManagerMode ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                            <h2 className={`text-lg font-bold ${isManagerMode ? 'text-blue-900' : 'text-gray-900'}`}>{editingId ? 'Editar Cadastro' : 'Novo Profissional'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className={`text-gray-400 hover:text-blue-600 transition-colors`}>✕</button>
                        </div>

                        {/* Tabs */}
                        <div className={`flex border-b ${isManagerMode ? 'border-blue-100' : 'border-gray-200'}`}>
                            <button
                                onClick={() => setActiveTab('PERSONAL')}
                                className={`flex-1 py-3 text-sm font-medium text-center transition-all ${activeTab === 'PERSONAL' ? (isManagerMode ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/30' : 'border-b-2 border-blue-600 text-blue-600 bg-blue-50') : (isManagerMode ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50/20' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}
                            >
                                1. Dados Pessoais
                            </button>
                            <button
                                onClick={() => setActiveTab('PROFESSIONAL')}
                                className={`flex-1 py-3 text-sm font-medium text-center transition-all ${activeTab === 'PROFESSIONAL' ? (isManagerMode ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/30' : 'border-b-2 border-blue-600 text-blue-600 bg-blue-50') : (isManagerMode ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50/20' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}
                            >
                                2. Profissional
                            </button>
                            <button
                                onClick={() => setActiveTab('ACCESS')}
                                className={`flex-1 py-3 text-sm font-medium text-center transition-all ${activeTab === 'ACCESS' ? (isManagerMode ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/30' : 'border-b-2 border-blue-600 text-blue-600 bg-blue-50') : (isManagerMode ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50/20' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}
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
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Nome Completo *</label>
                                        <input
                                            type="text" required
                                            className={`mt-1 block w-full border rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>CPF</label>
                                            <input
                                                type="text"
                                                placeholder="000.000.000-00"
                                                className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                                value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Telefone / Celular</label>
                                            <input
                                                type="text"
                                                placeholder="(00) 00000-0000"
                                                className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>WhatsApp (Opcional)</label>
                                            <input
                                                type="text"
                                                placeholder="(00) 00000-0000"
                                                className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                                value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>CEP</label>
                                        <input
                                            type="text"
                                            placeholder="00000-000"
                                            className={`mt-1 block w-32 border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                            value={formData.cep} onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.length > 8) val = val.slice(0, 8);
                                                if (val.length === 8) fetchAddressByCep(val);
                                                if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
                                                setFormData({ ...formData, cep: val });
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Endereço Residencial</label>
                                            <input
                                                type="text"
                                                className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                                value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Cidade</label>
                                                <input
                                                    type="text"
                                                    className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                                    value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Estado</label>
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    className={`mt-1 block w-full border rounded-md p-2.5 uppercase ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                                    value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
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
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Especialidade *</label>
                                        <input
                                            type="text" required
                                            placeholder="Ex: Cardiologia, Nutrição..."
                                            className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                            value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Registro Profissional (Conselho) *</label>
                                        <input
                                            type="text" required
                                            placeholder="Ex: CRM-SP 123456"
                                            className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                            value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'} mb-2`}>Cor na Agenda</label>
                                        <div className={`flex gap-2 flex-wrap p-3 rounded-lg border ${isManagerMode ? 'bg-blue-50/30 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                                            {colorOptions.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, color: c })}
                                                    className={`w-8 h-8 rounded-full border-2 ${c} ${formData.color === c ? (isManagerMode ? 'border-blue-600 scale-110 shadow-md' : 'border-gray-900 scale-110 shadow-md') : 'border-transparent'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-[10px] mt-1 font-bold uppercase ${isManagerMode ? 'text-blue-600' : 'text-gray-500'}`}>Essa cor será usada para identificar os agendamentos deste profissional.</p>
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
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>E-mail de Login *</label>
                                        <input
                                            type="email" required
                                            className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {editingId ? 'Redefinir Senha (deixe em branco para manter)' : 'Senha Inicial *'}
                                        </label>
                                        <input
                                            type="password"
                                            required={!editingId}
                                            className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-white border-blue-200 text-slate-800' : 'bg-white border-gray-300'}`}
                                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Nível de Acesso</label>
                                            <select
                                                className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' : 'bg-white border-gray-300'}`}
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                                            >
                                                <option value={Role.PROFESSIONAL}>Apenas Profissional</option>
                                                <option value={Role.CLINIC_ADMIN}>Administrador da Clínica</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-bold uppercase tracking-wide mb-1 ${isManagerMode ? 'text-blue-700' : 'text-gray-700'}`}>Status da Conta</label>
                                            <select
                                                className={`mt-1 block w-full border rounded-md p-2.5 ${isManagerMode ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' : 'bg-white border-gray-300'}`}
                                                value={String(formData.isActive)} // Ensure value is a string
                                                onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                                            >
                                                <option value="true">Ativo</option>
                                                <option value="false">Bloqueado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className={`flex justify-between items-center pt-6 border-t mt-6 ${isManagerMode ? 'border-blue-100' : 'border-gray-100'}`}>

                                {/* DELETE BUTTON (Left Aligned for UX) */}
                                <div className="flex items-center">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => requestDelete(editingId)}
                                            className={`text-sm font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors ${isManagerMode ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50' : 'text-red-600 hover:text-red-800 hover:bg-red-50'}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Excluir Profissional
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    {activeTab !== 'PERSONAL' && (
                                        <button type="button" onClick={() => {
                                            if (activeTab === 'ACCESS') setActiveTab('PROFESSIONAL');
                                            if (activeTab === 'PROFESSIONAL') setActiveTab('PERSONAL');
                                        }} className={`${isManagerMode ? 'text-blue-600 hover:underline' : 'text-gray-600 hover:underline'} text-sm mr-2 font-bold`}>Voltar</button>
                                    )}

                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancelar</button>
                                    {activeTab === 'ACCESS' ? (
                                        <button type="submit" className={`px-6 py-2 text-white rounded-md font-bold shadow-xl transition-all active:scale-95 ${isManagerMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                            Salvar Cadastro
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => {
                                            if (activeTab === 'PERSONAL') setActiveTab('PROFESSIONAL');
                                            if (activeTab === 'PROFESSIONAL') setActiveTab('ACCESS');
                                        }} className={`px-6 py-2 text-white rounded-md font-bold shadow-lg transition-all active:scale-95 ${isManagerMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-black'}`}>
                                            Próximo &rarr;
                                        </button>
                                    )}
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                    <div className={`${isManagerMode ? 'bg-white text-slate-800 border-blue-100' : 'bg-white text-gray-900 border-gray-200'} rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border`}>
                        <div className={`p-8 text-center`}>
                            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center animate-pulse">
                                <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Exclusão Permanente</h3>
                            <p className={`text-sm mb-4 ${isManagerMode ? 'text-slate-700' : 'text-gray-600'}`}>
                                Você está excluindo <strong>{professionals.find(p => p.id === deleteConfirmId)?.name}</strong> da clínica. 
                                Esta ação é irreversível e removerá o acesso do usuário imediatamente.
                            </p>

                            {/* Reassignment Section */}
                            <div className={`mt-6 mb-8 p-5 rounded-2xl border text-left ${isManagerMode ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isManagerMode ? 'text-blue-900' : 'text-slate-500'}`}>
                                    Remanejar Pacientes Para:
                                </label>
                                <select 
                                    className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 appearance-none`}
                                    value={reassignToId}
                                    onChange={(e) => setReassignToId(e.target.value)}
                                >
                                    <option value="none">Ninguém (Remover Profess. do Paciente)</option>
                                    {availableForReassignment.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-[10px] text-gray-500 leading-relaxed font-medium">
                                    Os pacientes serão transferidos para o profissional selecionado. Agendamentos futuros serão cancelados para evitar conflitos de horário.
                                </p>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className={`flex-1 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest border transition-all ${isManagerMode ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-5 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                                >
                                    Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Fix: Change to named export to resolve 'Module has no default export' in App.tsx
export { Professionals };
