import React from 'react';
import { Patient, Clinic, User } from '../../types';
import { Icons } from '../../constants';
import { PatientDetails } from '../PatientDetails';

interface PatientDashboardProps {
    patient: Patient;
    clinic: Clinic;
    onLogout: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ patient, clinic, onLogout }) => {
    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm relative z-50">
                <div className="flex bg-emerald-50 rounded-lg overflow-hidden">
                    <span className="px-3 py-1 font-bold text-emerald-800 flex items-center gap-2"><Icons.User className="w-4 h-4" /> Área do Paciente: {patient.name.split(' ')[0]}</span>
                </div>
                <button onClick={onLogout} title="Sair do Sistema" className="text-gray-500 hover:text-red-500 font-bold p-2 transition-colors">
                    <Icons.Logout className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 max-w-7xl mx-auto pb-20 pointer-events-none-if-strict" style={{ pointerEvents: 'auto' }}>
                <style>{`
                    .pointer-events-none-if-strict input,
                    .pointer-events-none-if-strict select,
                    .pointer-events-none-if-strict textarea {
                         pointer-events: none !important;
                         background-color: #f8fafc !important;
                    }
                    /* Ensure buttons like PDF gen remain active */
                `}</style>
                <PatientDetails
                    user={{} as User}
                    clinic={clinic}
                    isManagerMode={false}
                    isPatientMode={true}
                    patientData={patient}
                />
            </div>
        </div>
    );
};
