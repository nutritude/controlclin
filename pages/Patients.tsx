
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Clinic, Patient, Role, Professional } from '../types';
import { db } from '../services/db';

interface PatientsProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean; // New prop
}

const Patients: React.FC<PatientsProps> = ({ user, clinic, isManagerMode }) => {
  // In manager mode, see ALL patients; in professional mode, filter by professionalId
  const isProfessionalUser = !isManagerMode;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'Feminino',
    cpf: '',
    address: '',
    status: 'ATIVO',
    password: Math.random().toString(36).slice(-6), // Auto-generate 6-char password
    estadoCivil: '',
    pessoasEmCasa: '',
    professionalId: user.professionalId || ''
  });

  useEffect(() => {
    fetchPatients();
    if (isManagerMode) {
      db.getProfessionals(clinic.id).then(setProfessionals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.id, isProfessionalUser, user.professionalId, isManagerMode]); // Add professionalUser and professionalId as dependencies

  // --- REAL-TIME SYNC LISTENER ---
  useEffect(() => {
    const handleRemoteSync = () => {
      console.log('[Patients] ☁️ Sincronização em tempo real detectada. Atualizando lista...');
      fetchPatients();
    };

    window.addEventListener('db-remote-sync', handleRemoteSync);
    return () => window.removeEventListener('db-remote-sync', handleRemoteSync);
  }, []); // Only register once on mount

  const fetchPatients = async () => {
    setLoading(true);
    const profIdFilter = isProfessionalUser ? user.professionalId : undefined;

    console.log(`[Patients] Fetching data. Mode: ${isManagerMode ? 'MANAGER' : 'PROFESSIONAL'}, Filter PID: ${profIdFilter}`);

    // Trava de segurança: se for profissional mas o ID estiver nulo, não podemos trazer "todos"
    if (isProfessionalUser && !profIdFilter) {
      console.warn('[Patients] Professional mode active but professionalId is missing in user object. Returning empty.');
      setPatients([]);
      setLoading(false);
      return;
    }
    const data = await db.getPatients(clinic.id, profIdFilter, isManagerMode ? 'ADMIN' : 'PROFESSIONAL');
    setPatients(data);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: 'Feminino',
      cpf: '',
      address: '',
      status: 'ATIVO',
      password: Math.random().toString(36).slice(-6),
      estadoCivil: '',
      pessoasEmCasa: '',
      professionalId: user.professionalId || (professionals.length > 0 ? professionals[0].id : '')
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.createPatient(user, {
        ...formData,
        status: formData.status as 'ATIVO' | 'INATIVO',
        pessoasEmCasa: formData.pessoasEmCasa ? parseInt(formData.pessoasEmCasa as string, 10) : undefined,
        clinicId: clinic.id
      });
      setIsModalOpen(false);
      fetchPatients();
      alert('Salvo!');
    } catch (err) {
      alert('Erro ao cadastrar: ' + err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div>Carregando pacientes...</div>;

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-black uppercase tracking-tight ${isManagerMode ? 'text-blue-900' : 'text-slate-800'}`}>Pacientes</h1>
        <button
          onClick={handleOpenCreate}
          className={`px-4 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-2 font-black uppercase text-xs shadow-md ${isManagerMode ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <span>+</span> Novo Paciente
        </button>
      </div>

      <div className={`${isManagerMode ? 'bg-white border-blue-100 shadow-sm' : 'bg-white border-slate-200'} rounded-xl border overflow-x-auto custom-scrollbar`}>
        <table className="min-w-full divide-y divide-blue-50">
          <thead className={`${isManagerMode ? 'bg-blue-50' : 'bg-emerald-50'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-emerald-700'}`}>Nome / Cadastro</th>
              <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-emerald-700'}`}>CPF</th>
              <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-emerald-700'}`}>Contato</th>
              <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-emerald-700'}`}>Status</th>
              <th className={`px-6 py-3 text-right text-xs font-black uppercase tracking-wider ${isManagerMode ? 'text-blue-800' : 'text-emerald-700'}`}>Ação</th>
            </tr>
          </thead>
          <tbody className={`${isManagerMode ? 'bg-white divide-blue-50' : 'bg-white divide-slate-100'}`}>
            {patients.map((patient) => (
              <tr key={patient.id} className={`${isManagerMode ? 'hover:bg-blue-50/50' : 'hover:bg-emerald-50'}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold shrink-0 ${isManagerMode ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm' : 'bg-emerald-100 text-teal-800'}`}>
                      {patient.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-bold ${isManagerMode ? 'text-blue-900' : 'text-slate-900'}`}>{patient.name}</div>
                      <div className={`text-[11px] font-medium uppercase tracking-tight ${isManagerMode ? 'text-slate-500' : 'text-slate-600'}`}>Nasc: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${isManagerMode ? 'text-blue-800 bg-blue-50 border-blue-100' : 'text-emerald-700 bg-emerald-50'}`}>{patient.cpf || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${isManagerMode ? 'text-slate-800' : 'text-slate-900'}`}>{patient.email}</div>
                  <div className={`text-xs font-medium ${isManagerMode ? 'text-slate-500' : 'text-slate-600'}`}>{patient.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${patient.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {patient.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                  <Link to={`/patients/${patient.id}`} className={`${isManagerMode ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-600 hover:text-emerald-800'} transition-colors`}>
                    Abrir Prontuário
                  </Link>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={5} className={`px-6 py-8 text-center ${isManagerMode ? 'text-gray-400' : 'text-slate-500'} italic`}>Nenhum paciente cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/20 backdrop-blur-md p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl p-6 relative overflow-y-auto max-h-[90vh] ${isManagerMode ? 'bg-white border border-blue-100 text-slate-800' : 'bg-white text-slate-900'}`}>
            <div className={`flex justify-between items-center mb-6 border-b pb-3 ${isManagerMode ? 'border-blue-50' : 'border-slate-200'}`}>
              <h2 className={`text-xl font-black uppercase tracking-tight ${isManagerMode ? 'text-blue-900' : 'text-emerald-900'}`}>Cadastrar Novo Paciente</h2>
              <button onClick={() => setIsModalOpen(false)} className={`text-slate-400 hover:text-slate-600 transition-colors`}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Nome Completo *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-blue-50 border-blue-200 text-slate-800 focus:ring-blue-500 shadow-sm' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>CPF</label>
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00"
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Data de Nascimento *</label>
                  <input required type="date" name="birthDate" value={formData.birthDate} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Telefone / WhatsApp *</label>
                  <input required type="text" name="phone" value={formData.phone} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>E-mail</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Gênero Biológico</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`}>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange as any}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`}>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Endereço Completo</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Bairro, Cidade - UF"
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-blue-50 border-blue-200 text-slate-800 focus:ring-blue-500 shadow-sm' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Estado Civil</label>
                  <select name="estadoCivil" value={formData.estadoCivil || ''} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`}>
                    <option value="">Selecione...</option>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Pessoas em Casa</label>
                  <input type="number" name="pessoasEmCasa" min="1" value={formData.pessoasEmCasa || ''} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`} />
                </div>

                {isManagerMode && (
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Profissional Responsável *</label>
                    <select
                      required
                      name="professionalId"
                      value={formData.professionalId}
                      onChange={handleChange}
                      className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-blue-50 border-blue-200 text-slate-800 focus:ring-blue-500 shadow-sm' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500'}`}
                    >
                      <option value="">Selecione um profissional</option>
                      {professionals.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">Como Gestor, você deve atribuir este paciente a um profissional para que ele apareça na agenda dele.</p>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isManagerMode ? 'text-indigo-300' : 'text-emerald-700'}`}>Senha de Acesso ao APP *</label>
                  <input required type="text" name="password" value={formData.password} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 font-mono ${isManagerMode ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`} />
                  <p className="mt-1 text-[10px] text-gray-500 uppercase font-bold">Essa senha será enviada ao paciente para que ele acesse o portal.</p>
                </div>
              </div>

              <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isManagerMode ? 'border-gray-700' : 'border-slate-100'}`}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 border rounded-md font-bold shadow-sm ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Cancelar</button>
                <button type="submit"
                  className={`px-6 py-2 text-white rounded-md font-medium transition-transform active:scale-95 ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Salvar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
};

export { Patients };
