

import React, { useState } from 'react';
import { db } from '../services/db';
import { User, Clinic, Role } from '../types';

interface LoginProps {
  onLogin: (user: User, clinic: Clinic) => void;
}

type LoginMode = 'ADMIN' | 'PROFESSIONAL';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginMode, setLoginMode] = useState<LoginMode>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('control'); // Default to control for convenience
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await db.login(email.trim(), password.trim(), slug.trim());
      if (result) {
        // Simple check to warn if trying to login as Admin with a non-admin account in this demo context
        if (loginMode === 'ADMIN' && result.user.role !== Role.CLINIC_ADMIN && result.user.role !== Role.SUPER_ADMIN) {
          setError('Este usuário não possui perfil de Gestor. Tente a aba Profissional.');
          setIsSubmitting(false);
          return;
        }
        onLogin(result.user, result.clinic);
      } else {
        setError('Credenciais (e-mail ou senha) ou slug da clínica inválidos.');
      }
    } catch (err: any) {
      console.error("[Login] Caught error:", err);
      // Extrair a mensagem real do erro
      const errorMsg = err instanceof Error ? err.message : (err?.message || 'Ocorreu um erro inesperado.');

      // Traduzir erros feios do Firebase para mensagens amigáveis
      if (errorMsg.includes('auth/invalid-login-credentials') || errorMsg.includes('auth/invalid-credential')) {
        setError('E-mail ou senha incorretos.');
      } else if (errorMsg.includes('API key not valid')) {
        setError('Erro do Sistema: O banco de dados principal de demonstração está offline (API Key Inválida). Por favor, use a senha "123" para acessar no Modo Offline/Bypass.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

        {/* Header / Mode Selection */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="p-6 text-center pb-4">
            <h1 className="text-2xl font-bold text-gray-900">ControlClin SaaS</h1>
            <p className="text-sm text-gray-500 mt-1">Escolha como deseja acessar</p>
          </div>

          <div className="flex">
            <button
              onClick={() => { setLoginMode('ADMIN'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${loginMode === 'ADMIN'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            >
              Sou Gestor
            </button>
            <button
              onClick={() => { setLoginMode('PROFESSIONAL'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${loginMode === 'PROFESSIONAL'
                  ? 'border-emerald-600 text-emerald-600 bg-white' // Changed from purple to emerald
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            >
              Sou Profissional
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
            <div className="mt-0.5">
              {loginMode === 'ADMIN' ? (
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              ) : (
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
            </div>
            <div>
              <h3 className={`text-sm font-bold ${loginMode === 'ADMIN' ? 'text-blue-800' : 'text-emerald-800'}`}>
                {loginMode === 'ADMIN' ? 'Área Administrativa' : 'Área Clínica'}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {loginMode === 'ADMIN'
                  ? 'Acesso completo às configurações da clínica, relatórios financeiros, auditoria e gestão de usuários.'
                  : 'Foco no atendimento ao paciente, agenda pessoal, prontuário eletrônico e evolução clínica.'
                }
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug da Clínica</label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  https://
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="control"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={loginMode === 'ADMIN' ? "admin@clinica.com" : "doutor@clinica.com"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}
                ${loginMode === 'ADMIN' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'} 
              `}
            >
              {isSubmitting ? 'Entrando...' : `Acessar como ${loginMode === 'ADMIN' ? 'Gestor' : 'Profissional'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;