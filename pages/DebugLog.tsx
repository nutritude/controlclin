
import React, { useState, useEffect } from 'react';
import { User, Clinic, Role } from '../types';
import { logService } from '../services/logService';
import { Icons } from '../constants';

interface DebugLogProps {
  user: User;
  clinic: Clinic;
  isManagerMode: boolean;
}

interface LogEntry {
  timestamp: string;
  level: 'LOG' | 'WARN' | 'ERROR';
  message: string;
  args?: any[];
}

const DebugLog: React.FC<DebugLogProps> = ({ user, clinic, isManagerMode }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bugDescription, setBugDescription] = useState('');
  const [bugReportStatus, setBugReportStatus] = useState<string | null>(null);

  const fetchLogs = () => {
    setLogs(logService.getLogs());
  };

  useEffect(() => {
    fetchLogs();
    // In a real app, you might want to subscribe to logService changes
    // For this mock, explicit refresh is used.
  }, []);

  const handleClearLogs = () => {
    logService.clearLogs();
    fetchLogs();
  };

  const handleReportBug = () => {
    if (!bugDescription.trim()) {
      alert('Por favor, descreva o bug antes de reportar.');
      return;
    }
    const report = logService.reportBug(bugDescription, user);
    setBugReportStatus('Bug reportado com sucesso! (Ver console para detalhes)');
    setBugDescription('');
    fetchLogs(); // Logs might be cleared after reporting
    setTimeout(() => setBugReportStatus(null), 5000);
  };

  const mockedEndpoints = [
    { name: 'db.login', status: 'OK', description: 'Autenticação de usuário.' },
    { name: 'db.getPatients', status: 'OK', description: 'Busca lista de pacientes (com filtro de profissional).' },
    { name: 'db.getAppointments', status: 'OK', description: 'Busca agendamentos (com filtro de profissional).' },
    { name: 'db.createAppointment', status: 'OK', description: 'Cria novo agendamento.' },
    { name: 'db.updatePatient', status: 'OK', description: 'Atualiza dados do paciente.' },
    { name: 'db.analyzeExamWithAI', status: 'OK', description: 'Análise de exames com IA.' },
    { name: 'db.getClinicalAlerts', status: 'OK', description: 'Busca alertas clínicos.' },
    { name: 'db.generateReportCrossAnalysis', status: 'OK', description: 'Geração de relatórios operacionais com IA.' },
    { name: 'db.getFinancialReportData', status: 'OK', description: 'Busca dados de relatório financeiro.' },
  ];

  // Only allow access to admins
  if (!(user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN)) {
    return (
      <div className={`${isManagerMode ? 'text-gray-100' : 'text-gray-900'} p-8 text-center`}>
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isManagerMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-2xl font-bold ${isManagerMode ? 'text-white' : 'text-emerald-900'} flex items-center gap-2`}>
            <Icons.Bug /> Debug & Monitoramento
          </h1>
          <p className={`mt-1 ${isManagerMode ? 'text-gray-300' : 'text-emerald-700'}`}>
            Ferramentas para monitorar a aplicação e reportar problemas.
          </p>
        </div>
      </div>

      {/* Log Viewer */}
      <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
        <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Logs da Aplicação</h3>
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={fetchLogs}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isManagerMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Atualizar Logs
          </button>
          <button
            onClick={handleClearLogs}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isManagerMode ? 'bg-red-800 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            Limpar Logs
          </button>
        </div>
        <pre className={`w-full h-80 overflow-auto p-3 rounded-md text-xs font-mono whitespace-pre-wrap ${isManagerMode ? 'bg-gray-900 text-gray-300 border border-gray-700' : 'bg-gray-50 text-gray-700 border border-gray-300'}`}>
          {logs.length === 0 ? (
            <span className={isManagerMode ? 'text-gray-500' : 'text-gray-400'}>Nenhum log registrado.</span>
          ) : (
            logs.map((log, index) => (
              <p key={index} className={log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-yellow-500' : ''}>
                [{log.timestamp}] &lt;{log.level}&gt; {log.message} {log.args && JSON.stringify(log.args)}
              </p>
            ))
          )}
        </pre>
      </div>

      {/* Bug Report */}
      <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
        <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Reportar um Bug</h3>
        <textarea
          rows={4}
          placeholder="Descreva o problema em detalhes..."
          value={bugDescription}
          onChange={(e) => setBugDescription(e.target.value)}
          className={`w-full border rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 ${isManagerMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <button
          onClick={handleReportBug}
          className={`mt-4 px-4 py-2 rounded-md font-bold text-white transition-colors ${isManagerMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          Reportar Bug
        </button>
        {bugReportStatus && (
          <p className={`mt-2 text-sm font-medium ${isManagerMode ? 'text-green-400' : 'text-green-700'}`}>{bugReportStatus}</p>
        )}
      </div>

      {/* Endpoint Review */}
      <div className={`${isManagerMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg p-6 border`}>
        <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 ${isManagerMode ? 'text-gray-300' : 'text-gray-700'}`}>Revisão de Endpoints (Mocked)</h3>
        <ul className="space-y-2">
          {mockedEndpoints.map((endpoint, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <span className={isManagerMode ? 'text-gray-200' : 'text-gray-800'}>
                <code className={`font-mono ${isManagerMode ? 'text-gray-400' : 'text-gray-600'}`}>{endpoint.name}</code>: {endpoint.description}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${endpoint.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {endpoint.status}
              </span>
            </li>
          ))}
        </ul>
        <p className={`mt-4 text-xs italic ${isManagerMode ? 'text-gray-500' : 'text-gray-400'}`}>
          (Nota: Esta seção é estática e reflete o status 'OK' para fins de demonstração da arquitetura de mock de dados.)
        </p>
      </div>
    </div>
  );
};

export { DebugLog };
