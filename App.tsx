import React, { useState, useEffect } from 'react';
/* Force Vercel Rebuild - v2.0.4 - Applying Environment Variables */
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
import { DebugLog } from './pages/DebugLog'; // Import new DebugLog component
import { parseMasterCSV, parseSynonymCSV, parseNutrientCSV } from './services/food/catalogLoader';
import { ScientificCatalog } from './services/food/foodCatalogScientific';
import { db as serviceDb } from './services/db';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session and load catalog
  useEffect(() => {
    // 2. Catalog load
    const loadData = async () => {
      // 1. Session restore
      const storedUser = localStorage.getItem('app_user');
      const storedClinic = localStorage.getItem('app_clinic');

      // Load from remote BEFORE setting state to ensure we have latest data
      await serviceDb.loadFromRemote();

      if (storedUser && storedClinic) {
        try {
          setUser(JSON.parse(storedUser));
          setClinic(JSON.parse(storedClinic));
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
          {/* New Debug Route - visible only for admins */}
          <Route path="debug" element={<DebugLog user={user} clinic={clinic!} isManagerMode={isManagerMode} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;