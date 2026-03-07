
import React from 'react';
import { Clinic, Patient, Professional, User } from '../types';

interface PDFHeaderProps {
    clinic: Clinic;
    patient?: Patient;
    responsibleProfessional?: Professional | null;
    user?: User;
    title: string;
    subtitle?: string;
    showObjective?: boolean;
    patientObjective?: string;
}

const PDFHeader: React.FC<PDFHeaderProps> = ({
    clinic,
    patient,
    responsibleProfessional,
    user,
    title,
    subtitle,
    showObjective = false,
    patientObjective
}) => {
    return (
        <div className="flex flex-col items-start text-left border-b-2 border-emerald-600 pb-6 mb-8 w-full bg-white text-black font-sans">
            {clinic.logoUrl && (
                <img src={clinic.logoUrl} alt="Logo" className="h-16 mb-4 object-contain" crossOrigin="anonymous" />
            )}

            <div className="mb-4">
                <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter leading-none">{clinic.name}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">
                    {clinic.address}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                    {clinic.city ? `${clinic.city} ` : ''}
                    {clinic.phone ? ` • Tel: ${clinic.phone}` : ''}
                </p>
            </div>

            <div className="mb-6">
                <p className="text-[11px] font-bold text-slate-800 uppercase leading-none">
                    {responsibleProfessional?.name || user?.name} - {responsibleProfessional?.specialty || 'Nutricionista'} - {responsibleProfessional?.registrationNumber || ''}
                </p>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-black text-emerald-800 uppercase tracking-widest leading-tight">{title}</h1>
                    {subtitle && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{subtitle}</p>}
                </div>

                {patient && (
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest优化 whitespace-nowrap">Paciente:</span>
                            <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{patient.name}</p>
                        </div>
                        {showObjective && (
                            <div className="flex items-baseline gap-2">
                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest whitespace-nowrap">Objetivo:</span>
                                <p className="text-sm font-bold text-slate-600 italic leading-none">{patientObjective || patient.clinicalSummary?.clinicalGoal || 'Manutenção da saúde'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFHeader;
