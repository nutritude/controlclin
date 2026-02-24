
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { User, Clinic, Role } from '../types';
import { Icons } from '../constants';

interface LayoutProps {
  user: User;
  clinic: Clinic;
  onLogout: () => void;
  isManagerMode: boolean; // New prop
}

const Layout: React.FC<LayoutProps> = ({ user, clinic, onLogout, isManagerMode }) => {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
      ? isManagerMode
        ? 'bg-indigo-700 text-white font-bold' // Manager active dark
        : 'bg-emerald-700 text-white font-bold' // Professional active green
      : isManagerMode
        ? 'text-gray-300 hover:text-white hover:bg-gray-700' // Manager inactive dark
        : 'text-emerald-200 hover:text-white hover:bg-emerald-700 font-medium' // Professional inactive green
    }`;

  // Simple Bell Icon for Alerts (no change needed here, it's already defined)
  const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${isManagerMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      {/* Sidebar */}
      <aside className={`w-64 ${isManagerMode ? 'bg-gray-800' : 'bg-emerald-800'} text-white flex flex-col shadow-xl z-40 flex-shrink-0 print:hidden`}>
        {/* BRANDING HEADER */}
        <div className={`p-6 border-b ${isManagerMode ? 'border-gray-700' : 'border-emerald-700/50'} flex-none flex flex-col items-center text-center`}>
          <div className="mb-3 w-full flex justify-center">
            {clinic.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt="Logo"
                className="max-h-20 w-auto object-contain"
              />
            ) : (
              <span className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-bold shadow-lg">
                {clinic.name.charAt(0)}
              </span>
            )}
          </div>

          <h1 className="text-lg font-bold tracking-tight text-white w-full break-words leading-tight">
            {clinic.name}
          </h1>
          <p className={`text-xs mt-2 uppercase tracking-wider truncate w-full ${isManagerMode ? 'text-gray-400' : 'text-emerald-300'}`}>
            {clinic.slug}.saas.com
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavLink to="/" className={navItemClass}>
            <Icons.Activity />
            <span>Painel</span>
          </NavLink>

          <NavLink to="/agenda" className={navItemClass}>
            <Icons.Calendar />
            <span>Agenda</span>
          </NavLink>

          <NavLink to="/patients" className={navItemClass}>
            <Icons.Users />
            <span>Pacientes</span>
          </NavLink>

          <NavLink to="/alerts" className={navItemClass}>
            <AlertIcon />
            <span>Alertas Clínicos</span>
          </NavLink>

          <NavLink to="/reports" className={navItemClass}>
            <Icons.FileText />
            <span>Relatórios</span>
          </NavLink>

          {(user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN) && (
            <>
              <div className="pt-4 pb-2">
                <p className={`px-4 text-xs font-semibold uppercase tracking-wider ${isManagerMode ? 'text-gray-500' : 'text-emerald-400'}`}>Gestão</p>
              </div>
              <NavLink to="/professionals" className={navItemClass}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Profissionais</span>
              </NavLink>
              <NavLink to="/settings" className={navItemClass}>
                <Icons.Settings />
                <span>Ajustes da Clínica</span>
              </NavLink>
              <NavLink to="/debug" className={navItemClass}> {/* New debug link */}
                <Icons.Bug />
                <span>Debug & Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className={`p-4 border-t ${isManagerMode ? 'border-gray-700' : 'border-emerald-700/50'} flex-none`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isManagerMode ? 'bg-gray-700' : 'bg-emerald-700'}`}>
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className={`text-xs truncate w-full ${isManagerMode ? 'text-gray-400' : 'text-emerald-300'}`}>{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${isManagerMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-emerald-300 hover:text-white hover:bg-emerald-700'}`}
          >
            <Icons.Logout />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isManagerMode ? 'bg-gray-900' : 'bg-slate-50'}`}>

        {/* Top Header */}
        <header className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border-b px-8 py-4 flex justify-between items-center flex-none z-30 shadow-sm print:hidden`}>
          <h2 className={`text-xl font-semibold truncate ${isManagerMode ? 'text-white' : 'text-slate-800'}`}>Portal da Clínica (v2.0.1)</h2>
          <div className="flex items-center gap-4">
            <span className={`hidden sm:inline-block text-xs font-bold px-3 py-1 rounded-full border ${isManagerMode ? 'bg-indigo-700 text-white border-indigo-500' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
              {isManagerMode ? 'Modo Gerencial' : 'Modo Profissional'}
            </span>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto h-full flex flex-col print:max-w-none print:h-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
