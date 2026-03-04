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
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
      ? isManagerMode
        ? 'bg-blue-500 text-white font-black shadow-md transform scale-[1.02]'
        : 'bg-emerald-700 text-white font-black shadow-lg transform scale-[1.02]'
      : isManagerMode
        ? 'text-blue-800 hover:text-blue-900 hover:bg-white/50'
        : 'text-emerald-100 hover:text-white hover:bg-emerald-700/60 font-medium'
    }`;

  const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${isManagerMode ? 'bg-slate-50' : 'bg-slate-50'}`}>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] 2xl:hidden backdrop-blur-md transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 transform transition-transform duration-300 ease-in-out 2xl:relative 2xl:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isManagerMode ? 'bg-[#f0f7ff] border-r border-blue-100' : 'bg-emerald-800'} 
        ${isManagerMode ? 'text-slate-800' : 'text-white'} flex flex-col shadow-xl flex-shrink-0 print:hidden max-w-[85vw]
      `}>
        {/* BRANDING HEADER */}
        <div className={`p-5 md:p-6 border-b ${isManagerMode ? 'border-blue-100' : 'border-emerald-700/50'} flex-none flex flex-col items-center text-center`}>
          <div className="mb-2 w-full flex justify-center">
            {clinic.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt="Logo"
                className="max-h-12 md:max-h-16 w-auto object-contain"
              />
            ) : (
              <span className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl md:text-2xl font-bold shadow-lg">
                {clinic.name.charAt(0)}
              </span>
            )}
          </div>

          <h1 className={`text-sm md:text-base font-black uppercase tracking-tight w-full break-words leading-tight ${isManagerMode ? 'text-blue-900' : 'text-white'}`}>
            {clinic.name}
          </h1>
          <p className={`text-[9px] mt-1 uppercase tracking-widest font-bold truncate w-full ${isManagerMode ? 'text-blue-600/60' : 'text-emerald-300'}`}>
            {clinic.slug}.saas.com
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <NavLink to="/" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Activity />
            <span>Painel</span>
          </NavLink>

          <NavLink to="/agenda" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Calendar />
            <span>Agenda</span>
          </NavLink>

          <NavLink to="/patients" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.Users />
            <span>Pacientes</span>
          </NavLink>

          <NavLink to="/alerts" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <AlertIcon />
            <span>Alertas Clínicos</span>
          </NavLink>

          <NavLink to="/reports" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Icons.FileText />
            <span>Relatórios</span>
          </NavLink>

          {isManagerMode && (user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN) && (
            <>
              <div className="pt-4 pb-2">
                <p className={`px-4 text-[10px] font-black uppercase tracking-wider ${isManagerMode ? 'text-blue-400' : 'text-emerald-400'}`}>Gestão Clínica</p>
              </div>
              <NavLink to="/professionals" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Profissionais</span>
              </NavLink>
              <NavLink to="/settings" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
                <Icons.Settings />
                <span>Ajustes da Clínica</span>
              </NavLink>
              <NavLink to="/debug" className={navItemClass} onClick={() => setIsMobileMenuOpen(false)}>
                <Icons.Bug />
                <span>Debug & Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className={`p-4 border-t ${isManagerMode ? 'border-blue-100 bg-blue-50/50' : 'border-emerald-700/50 bg-black/10'} flex-none`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isManagerMode ? 'bg-blue-600 text-white' : 'bg-emerald-700 text-white'}`}>
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className={`text-sm font-bold truncate ${isManagerMode ? 'text-blue-900' : 'text-white'}`}>{user.name}</p>
              <p className={`text-[10px] truncate w-full uppercase font-bold ${isManagerMode ? 'text-blue-600' : 'text-emerald-300'}`}>{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${isManagerMode ? 'text-blue-800 hover:text-blue-900 hover:bg-white' : 'text-emerald-300 hover:text-white hover:bg-emerald-700'}`}
          >
            <Icons.Logout />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isManagerMode ? 'bg-slate-50' : 'bg-slate-50'}`}>

        {/* Top Header */}
        <header className={`${isManagerMode ? 'bg-white border-blue-100' : 'bg-white border-slate-200'} border-b px-4 2xl:px-8 py-2 md:py-3 flex justify-between items-center flex-none z-30 shadow-sm print:hidden`}>
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
            <span className={`text-[9px] md:text-xs font-black px-2 md:px-3 py-1 rounded-full border shadow-sm ${isManagerMode ? 'bg-blue-100 text-blue-800 border-blue-200 uppercase' : 'bg-emerald-100 text-emerald-800 border-emerald-200 uppercase'}`}>
              {isManagerMode ? 'Foco: Gestão Estratégica' : 'Foco: Clínico'}
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
