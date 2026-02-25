
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Clinic, Patient, Role } from '../types';
import { db } from '../services/db';

interface PatientsProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean; // New prop
}

const Patients: React.FC<PatientsProps> = ({ user, clinic, isManagerMode }) => {
  const isProfessionalUser = user.role === Role.PROFESSIONAL;

  const [patients, setPatients] = useState<Patient[]>([]);
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
    status: 'ATIVO'
  });

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.id, isProfessionalUser, user.professionalId]); // Add professionalUser and professionalId as dependencies

  const fetchPatients = async () => {
    setLoading(true);
    // Filter patients by professional ID if in professional mode
    const data = await db.getPatients(clinic.id, isProfessionalUser ? user.professionalId : undefined);
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
      status: 'ATIVO'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.createPatient(user, {
        ...formData,
        status: formData.status as 'ATIVO' | 'INATIVO',
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
        <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>Pacientes</h1>
        <button
          onClick={handleOpenCreate}
          className={`px-4 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-2 font-bold shadow-sm ${isManagerMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <span>+</span> Novo Paciente
        </button>
      </div>

      <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-sm overflow-hidden rounded-xl border`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`${isManagerMode ? 'bg-gray-700' : 'bg-emerald-50'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Nome</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>CPF</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Contato</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Status</th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Ação</th>
            </tr>
          </thead>
          <tbody className={`${isManagerMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-slate-100'}`}>
            {patients.map((patient) => (
              <tr key={patient.id} className={`${isManagerMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-teal-800 font-bold shrink-0 ${isManagerMode ? 'bg-teal-900/50 border border-teal-700' : 'bg-emerald-100'}`}>
                      {patient.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-medium ${isManagerMode ? 'text-white' : 'text-slate-900'}`}>{patient.name}</div>
                      <div className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-slate-600'}`}>Nasc: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-mono px-2 rounded w-fit ${isManagerMode ? 'text-gray-200 bg-gray-700' : 'text-emerald-700 bg-emerald-50'}`}>{patient.cpf || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm ${isManagerMode ? 'text-white' : 'text-slate-900'}`}>{patient.email}</div>
                  <div className={`text-sm ${isManagerMode ? 'text-gray-300' : 'text-slate-600'}`}>{patient.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${patient.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {patient.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/patients/${patient.id}`} className={`${isManagerMode ? 'text-indigo-400 hover:text-indigo-200' : 'text-emerald-600 hover:text-emerald-800'} font-bold`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className={`rounded-xl shadow-xl w-full max-w-2xl p-6 relative overflow-y-auto max-h-[90vh] ${isManagerMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-slate-900'}`}>
            <div className={`flex justify-between items-center mb-6 border-b pb-2 ${isManagerMode ? 'border-gray-700' : 'border-slate-200'}`}>
              <h2 className={`text-xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'}`}>Cadastrar Novo Paciente</h2>
              <button onClick={() => setIsModalOpen(false)} className={`${isManagerMode ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>Nome Completo *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500 focus:border-indigo-500' : 'bg-white border-slate-300 text-emerald-900 focus:ring-emerald-500 focus:border-emerald-500'}`} />
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
                    className={`mt-1 block w-full border rounded-md p-2 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-slate-300 text-emerald-900'}`} />
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
    </div>
  );
};

export { Patients };
