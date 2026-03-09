import React, { useState, useEffect, Suspense, lazy } from 'react';
/* Force Vercel Rebuild - v3.0.0 - Performance Optimization: Lazy Loading & Background CSV Loading */
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, Clinic, Role, Patient } from './types';
import Layout from './components/Layout';

// Lazy load pages for performance (Code Splitting)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Agenda = lazy(() => import('./pages/Agenda').then(m => ({ default: m.Agenda })));
const Patients = lazy(() => import('./pages/Patients').then(m => ({ default: m.Patients })));
const PatientDetails = lazy(() => import('./pages/PatientDetails').then(m => ({ default: m.PatientDetails })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Professionals = lazy(() => import('./pages/Professionals').then(m => ({ default: m.Professionals })));
const ClinicalAlerts = lazy(() => import('./pages/ClinicalAlerts').then(m => ({ default: m.ClinicalAlerts })));
const SuccessCard = lazy(() => import('./pages/SuccessCard').then(m => ({ default: m.SuccessCard })));
const DebugLog = lazy(() => import('./pages/DebugLog').then(m => ({ default: m.DebugLog })));
const PatientLogin = lazy(() => import('./pages/patient/PatientLogin').then(m => ({ default: m.PatientLogin })));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const SaaSLogin = lazy(() => import('./pages/saas/SaaSLogin').then(m => ({ default: m.SaaSLogin })));
const SaaSDashboard = lazy(() => import('./pages/saas/SaaSDashboard'));
import { parseMasterCSV, parseSynonymCSV, parseNutrientCSV } from './services/food/catalogLoader';
import { ScientificCatalog } from './services/food/foodCatalogScientific';
import { db as serviceDb } from './services/db';
import { firebaseError } from './services/firebase';
import { CacheManager } from './services/cacheService';

function App() {
  // --- BACKGROUND UPDATE CHECK ---
  useEffect(() => {
    // Verifica uma vez ao montar
    CacheManager.checkForUpdates();

    // E verifica a cada 30 minutos se a aba estiver aberta
    const interval = setInterval(() => CacheManager.checkForUpdates(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full border-l-8 border-red-500">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Configuração Incompleta no Vercel</h1>
          <p className="text-gray-700 mb-4 text-lg">O sistema não pôde ser iniciado porque as chaves do Firebase (Environment Variables) estão ausentes no servidor.</p>
          <div className="bg-gray-100 p-4 rounded mb-6 font-mono text-sm text-gray-800 border border-gray-200">
            <strong>Exemplo de erro estrutural:</strong> VITE_FIREBASE_API_KEY is undefined
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Como resolver:</h2>
          <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-6">
            <li>Acesse o painel do seu projeto no menu do <strong>Vercel</strong>.</li>
            <li>Vá em <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.</li>
            <li>Adicione todas as chaves (ex: <code className="bg-gray-200 px-1 rounded">VITE_FIREBASE_API_KEY</code>, <code className="bg-gray-200 px-1 rounded">VITE_GEMINI_API_KEY</code>).</li>
            <li>Vá na aba <strong>Deployments</strong>, clique nos três pontos (<strong>...</strong>) do último deploy e faça um <strong>Redeploy</strong>.</li>
          </ol>
          <button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors">
            Tentar Carregar Novamente
          </button>
        </div>
      </div>
    );
  }

  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loginMode, setLoginMode] = useState<'ADMIN' | 'PROFESSIONAL' | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientClinic, setPatientClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session and load catalog
  useEffect(() => {
    // 2. Catalog load
    const loadData = async () => {
      // 1. Session restore
      const storedUserRaw = localStorage.getItem('app_user');
      const storedClinicRaw = localStorage.getItem('app_clinic');
      let clinicIdToLoad: string | undefined;

      if (storedClinicRaw) {
        try {
          const c = JSON.parse(storedClinicRaw);
          clinicIdToLoad = c.id;
        } catch (e) { }
      }

      // Load from remote BEFORE setting state to ensure we have latest data
      await serviceDb.loadFromRemote(clinicIdToLoad);

      if (storedUserRaw && storedClinicRaw) {
        try {
          let parsedUser = JSON.parse(storedUserRaw);
          const parsedClinic = JSON.parse(storedClinicRaw);
          const storedLoginMode = localStorage.getItem('app_login_mode') as 'ADMIN' | 'PROFESSIONAL' | null;

          // --- CRITICAL SESSION RE-SYNC ---
          // After loading from remote, the internal professionalId might have changed. 
          // We must ensure the session 'user' object reflects the latest database state.
          const clinicId = parsedClinic.id;
          const allUsers = await serviceDb.getUsers(clinicId);
          const freshUser = allUsers.find(u => u.email.toLowerCase() === parsedUser.email.toLowerCase());

          if (freshUser) {
            console.log(`[System] Session Re-sync: ${freshUser.name} (PID: ${freshUser.professionalId})`);
            parsedUser = freshUser;
            localStorage.setItem('app_user', JSON.stringify(freshUser));
          }

          setUser(parsedUser);
          setClinic(parsedClinic);

          // Se não houver modo salvo ou se for um usuário comum, sempre PROFESSIONAL
          const isAdmin = parsedUser.role === Role.CLINIC_ADMIN || parsedUser.role === Role.SUPER_ADMIN;
          const targetMode = (isAdmin && storedLoginMode) ? storedLoginMode : 'PROFESSIONAL';

          console.log(`[System] Session Restore: ${parsedUser.name} (${parsedUser.role}) -> Mode: ${targetMode}`);
          setLoginMode(targetMode);
        } catch (err) {
          console.error('[App] Stored session corrupted. Clearing...', err);
          handleLogout();
        }
      }

      // 1.5 Patient Session Restore
      const storedPatientRaw = localStorage.getItem('app_patient');
      const storedPatientClinicRaw = localStorage.getItem('app_patient_clinic');
      if (storedPatientRaw && storedPatientClinicRaw) {
        try {
          setPatient(JSON.parse(storedPatientRaw));
          setPatientClinic(JSON.parse(storedPatientClinicRaw));
          console.log('[System] Patient Session Restored');
        } catch (e) { }
      }

      // 2. Catalog load - MOVIDO PARA BACKGROUND: Não bloqueia o carregamento inicial da UI
      const loadCatalog = async () => {
        try {
          const masterRes = await fetch('./data/MASTER_ALIMENTOS_UID_DEDUP_PTBR.csv');
          if (masterRes.ok) {
            const text = await masterRes.text();
            const { records } = parseMasterCSV(text);
            ScientificCatalog.initMasterCatalog(records);
          }

          const synonymRes = await fetch('./data/DICIONARIO_SINONIMOS_ALIMENTOS_UID.csv');
          if (synonymRes.ok) {
            const text = await synonymRes.text();
            const { entries } = parseSynonymCSV(text);
            ScientificCatalog.initSynonymIndex(entries);
          }

          const nutrientRes = await fetch('./data/DICIONARIO_NUTRIENTES_PADRONIZADOS.csv');
          if (nutrientRes.ok) {
            const text = await nutrientRes.text();
            const { defs } = parseNutrientCSV(text);
            ScientificCatalog.initNutrientDictionary(defs);
          }
        } catch (err) {
          console.error('[App] Failed to load scientific catalog:', err);
        }
      };

      // Dispara o carregamento do catálogo em background sem await
      loadCatalog();

      // Conclui o loading da UI assim que a sessão for verificada e o DB remoto estiver pronto
      setLoading(false);
    };

    loadData();
  }, []);

  // --- Real-time Session Sync ---
  useEffect(() => {
    const handleRemoteSync = async () => {
      // Professional Sync
      if (user && clinic) {
        console.log('[System] ☁️ DB Sync detected. Refreshing session user...');
        const allUsers = await serviceDb.getUsers(clinic.id);
        const freshUser = allUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('app_user', JSON.stringify(freshUser));
        }
      }

      // Patient Sync
      if (patient && patientClinic) {
        console.log('[System] ☁️ DB Sync detected. Refreshing patient session...');
        const allPatients = await serviceDb.getPatients(patientClinic.id);
        const freshPatient = allPatients.find(p => p.id === patient.id);
        if (freshPatient) {
          setPatient(freshPatient);
          localStorage.setItem('app_patient', JSON.stringify(freshPatient));
        }
      }
    };
    window.addEventListener('db-remote-sync', handleRemoteSync);
    return () => window.removeEventListener('db-remote-sync', handleRemoteSync);
  }, [user, clinic, patient, patientClinic]);

  const handleLogin = (u: User, c: Clinic, mode: 'ADMIN' | 'PROFESSIONAL') => {
    setUser(u);
    setClinic(c);
    setLoginMode(mode);
    localStorage.setItem('app_user', JSON.stringify(u));
    localStorage.setItem('app_clinic', JSON.stringify(c));
    localStorage.setItem('app_login_mode', mode);
  };

  const handleLogout = () => {
    setUser(null);
    setClinic(null);
    setLoginMode(null);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_clinic');
    localStorage.removeItem('app_login_mode');
    localStorage.removeItem('app_patient'); // Also clear patient if professional logs out
    localStorage.removeItem('app_patient_clinic');
  };

  const handlePatientLogin = (p: Patient, c: Clinic) => {
    setPatient(p);
    setPatientClinic(c);
    localStorage.setItem('app_patient', JSON.stringify(p));
    localStorage.setItem('app_patient_clinic', JSON.stringify(c));
  };

  const handlePatientLogout = () => {
    setPatient(null);
    setPatientClinic(null);
    localStorage.removeItem('app_patient');
    localStorage.removeItem('app_patient_clinic');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;

  // Security Guard: isManagerMode is true ONLY if the login mode is ADMIN AND the user actually HAS admin privileges.
  // This is the single source of truth for the entire UI state (colors, sidebars, filters).
  const isManagerMode = Boolean(
    loginMode === 'ADMIN' &&
    user &&
    (user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN)
  );

  const LoadingFallback = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Módulo...</p>
    </div>
  );

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Admin/Professional Routes */}
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />

          <Route path="/" element={user && clinic ? <Layout user={user} clinic={clinic!} onLogout={handleLogout} isManagerMode={isManagerMode} /> : <Navigate to={patient ? "/patient" : "/login"} />} >
            <Route index element={<Dashboard user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="agenda" element={<Agenda user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="patients" element={<Patients user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="patients/:id" element={<PatientDetails user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="alerts" element={<ClinicalAlerts user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="reports" element={<Reports user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="professionals" element={<Professionals user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="settings" element={<Settings user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
            <Route path="debug" element={<DebugLog user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          </Route>

          {/* Patient Portal Routes */}
          <Route path="/patient/login" element={!patient ? <PatientLogin onLogin={handlePatientLogin} /> : <Navigate to="/patient" />} />
          <Route path="/patient" element={patient && patientClinic ? <PatientDashboard patient={patient} clinic={patientClinic} onLogout={handlePatientLogout} /> : <Navigate to="/patient/login" />} />

          {/* Public/Clean Routes outside Layout */}
          <Route path="/success-card/:id" element={<SuccessCard user={user || undefined} clinic={clinic || undefined} />} />

          {/* SaaS Backoffice Routes */}
          <Route path="/saas/login" element={<SaaSLogin />} />
          <Route path="/saas/dashboard" element={<SaaSDashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;