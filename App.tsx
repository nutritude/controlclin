import React, { useState, useEffect } from 'react';
/* Force Vercel Rebuild - v2.0.5 - Adding Fallback Env Var Screen */
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, Clinic, Role } from './types';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
// Fix: Changed to a named import to match the component's export and fix the "no default export" error.
import { Agenda } from './pages/Agenda';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Professionals } from './pages/Professionals';
import { ClinicalAlerts } from './pages/ClinicalAlerts'; // Keep named import
import { SuccessCard } from './pages/SuccessCard';
import { DebugLog } from './pages/DebugLog'; // Import new DebugLog component
import { parseMasterCSV, parseSynonymCSV, parseNutrientCSV } from './services/food/catalogLoader';
import { ScientificCatalog } from './services/food/foodCatalogScientific';
import { db as serviceDb } from './services/db';
import { firebaseError } from './services/firebase';

function App() {
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
          setUser(JSON.parse(storedUserRaw));
          setClinic(JSON.parse(storedClinicRaw));
        } catch (err) {
          console.error('[App] Stored session corrupted. Clearing...', err);
          localStorage.removeItem('app_user');
          localStorage.removeItem('app_clinic');
        }
      }

      // 2. Catalog load
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
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogin = (u: User, c: Clinic) => {
    setUser(u);
    setClinic(c);
    localStorage.setItem('app_user', JSON.stringify(u));
    localStorage.setItem('app_clinic', JSON.stringify(c));
  };

  const handleLogout = () => {
    setUser(null);
    setClinic(null);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_clinic');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;

  const isManagerMode = user ? (user.role === Role.CLINIC_ADMIN || user.role === Role.SUPER_ADMIN) : false;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />

        <Route path="/" element={user && clinic ? <Layout user={user} clinic={clinic!} onLogout={handleLogout} isManagerMode={isManagerMode} /> : <Navigate to="/login" />} >
          <Route index element={<Dashboard user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="agenda" element={<Agenda user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="patients" element={<Patients user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="patients/:id" element={<PatientDetails user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="alerts" element={<ClinicalAlerts user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="reports" element={<Reports user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="professionals" element={<Professionals user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="settings" element={<Settings user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
          <Route path="success-card/:id" element={<SuccessCard user={user} clinic={clinic!} />} />
          {/* New Debug Route - visible only for admins */}
          <Route path="debug" element={<DebugLog user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;