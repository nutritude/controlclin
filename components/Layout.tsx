import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { User, Clinic, Role } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';

interface LayoutProps {
  user: User;
  clinic: Clinic;
  onLogout: () => void;
  isManagerMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ user, clinic, onLogout, isManagerMode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
      ? isManagerMode
        ? 'bg-indigo-50 text-indigo-700 font-black shadow-sm border border-indigo-100 transform scale-[1.02]'
        : 'bg-emerald-50 text-emerald-700 font-black shadow-sm border border-emerald-100'
      : isManagerMode
        ? 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50'
        : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50'
    }`;

  const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F1F5F9]">

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-[60] 2xl:hidden backdrop-blur-sm transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 transform transition-transform duration-300 ease-in-out 2xl:relative 2xl:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isManagerMode ? 'bg-[#FDFDFD] border-r border-indigo-50 text-slate-800 shadow-xl' : 'bg-[#FDFDFD] border-r border-slate-100 text-slate-800 shadow-xl'}
        flex flex-col flex-shrink-0 print:hidden max-w-[85vw]
      `}>
        {/* BRANDING HEADER */}
        <div className={`p-5 md:p-6 border-b ${isManagerMode ? 'border-indigo-50' : 'border-emerald-100'} flex-none flex flex-col items-center text-center`}>
          <div className="mb-2 w-full flex justify-center">
            {clinic.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt="Logo"
                className={`max-h-12 md:max-h-16 w-auto object-contain`}
              />
            ) : (
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl md:text-2xl font-bold shadow-lg text-white`}>
                {clinic.name.charAt(0)}
              </div>
            )}
          </div>

          <h1 className={`text-sm md:text-base font-black uppercase tracking-tight w-full break-words leading-tight ${isManagerMode ? 'text-indigo-900' : 'text-slate-800'}`}>
            {clinic.name}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2 w-full">
            <div className={`size-1.5 rounded-full animate-pulse ${isManagerMode ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
            <p className={`text-[10px] uppercase tracking-[0.2em] font-black ${isManagerMode ? 'text-indigo-400' : 'text-slate-400'}`}>
              Sistema Ativo
            </p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar py-4">
          <NavLink to="/" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Activity className="size-5" />
            <span className="text-sm">Painel</span>
          </NavLink>

          <NavLink to="/agenda" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Calendar className="size-5" />
            <span className="text-sm">Agenda</span>
          </NavLink>

          <NavLink to="/patients" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Users className="size-5" />
            <span className="text-sm">Pacientes</span>
          </NavLink>

          <NavLink to="/alerts" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <AlertIcon />
            <span className="text-sm">Alertas Clínicos</span>
          </NavLink>

          <NavLink to="/reports" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.FileText className="size-5" />
            <span className="text-sm">Relatórios</span>
          </NavLink>

          <NavLink to="/help" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.HelpCircle className="size-5" />
            <span className="text-sm">Ajuda</span>
          </NavLink>

          {isManagerMode && (user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN) && (
            <div className="pt-6 space-y-2">
              <p className={`px-4 text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${isManagerMode ? 'text-blue-400' : 'text-emerald-400'}`}>Gestão Clínica</p>
              <NavLink to="/professionals" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
                <Icons.Users className="size-5 opacity-50" />
                <span className="text-sm">Equipe</span>
              </NavLink>
              <NavLink to="/settings" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
                <Icons.Settings className="size-5 opacity-50" />
                <span className="text-sm">Configurações</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* PROFILE FOOTER */}
        <div className={`p-4 border-t ${isManagerMode ? 'border-indigo-50 bg-indigo-50/30' : 'border-slate-100 bg-slate-50'} flex-none mt-auto`}>
          {isManagerMode ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-indigo-600 text-white shadow-md">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold truncate text-indigo-950">{user.name}</p>
                  <p className="text-[10px] truncate w-full uppercase font-bold text-indigo-600 tracking-widest">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors text-indigo-700 hover:text-indigo-900 hover:bg-white"
              >
                <Icons.Logout className="size-4" />
                Sair
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="size-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-emerald-600 shadow-sm">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-slate-800">{user.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white hover:bg-rose-50 border border-slate-100 hover:border-rose-100 hover:text-rose-500 rounded-xl transition-all text-slate-500"
              >
                <Icons.Logout className="size-3" />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isManagerMode ? 'bg-slate-50' : 'bg-slate-50'}`}>

        {/* Top Header */}
        <header className={`${isManagerMode ? 'bg-white border-indigo-50' : 'bg-white border-slate-200'} border-b px-4 2xl:px-8 py-2 md:py-3 flex justify-between items-center flex-none z-30 shadow-sm print:hidden`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="2xl:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-xs md:text-xl font-black tracking-tight truncate ${isManagerMode ? 'text-slate-800' : 'text-slate-800'} uppercase`}>
                  {isManagerMode ? 'Portal da Clínica (Gestão)' : 'Portal da Clínica'}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${db.isRemoteEnabled ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20' : 'bg-red-500'}`}></div>
                <span className="text-[8px] md:text-[9px] text-gray-400 uppercase tracking-widest font-black whitespace-nowrap">
                  {db.isRemoteEnabled ? 'NUVEM ATIVA' : 'LOCAL OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <span className={`text-[9px] md:text-xs font-black px-2 md:px-3 py-1 rounded-full border shadow-sm ${isManagerMode ? 'bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-widest font-black' : 'bg-emerald-100 text-emerald-800 border-emerald-200 uppercase'}`}>
              {isManagerMode ? 'Gestão Estratégica' : 'Foco: Clínico'}
            </span>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto h-full flex flex-col print:max-w-none print:h-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
