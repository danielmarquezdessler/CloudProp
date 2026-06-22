import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { PropertiesView } from './components/PropertiesView';
import { UsersView } from './components/UsersView';
import { AuditLogsView } from './components/AuditLogsView';
import { FirebaseAdminView } from './components/FirebaseAdminView';
import { AguadiCabinetView } from './components/AguadiCabinetView';
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, login, loading, error, t } = useAuth();
  
  // Tab Routing State (with deep link support for /super-admin/aguadi)
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/super-admin/aguadi' || path.endsWith('/super-admin/aguadi') || path.endsWith('/aguadi')) {
      return 'aguadi';
    }
    return 'dashboard';
  });

  React.useEffect(() => {
    // Synchronize URL and page state natively
    if (currentTab === 'aguadi') {
      if (window.location.pathname !== '/super-admin/aguadi') {
        window.history.pushState(null, '', '/super-admin/aguadi');
      }
    } else {
      if (window.location.pathname === '/super-admin/aguadi') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [currentTab]);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Login Credentials States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [btnSubmitting, setBtnSubmitting] = useState(false);
  const [showForgotMsg, setShowForgotMsg] = useState(false);


  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setBtnSubmitting(true);
    await login(email.trim(), password);
    setBtnSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold tracking-wide text-slate-500 font-mono">
            VERIFICANDO INGRESO SEGURO...
          </span>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (Rule 8: Simple login with no unnecessary tabs)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 dark:bg-slate-950/60" id="login-layout">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8 space-y-6 dark:bg-slate-900 dark:border-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-teal-500/10 p-2 rounded-xl text-teal-600">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold font-mono tracking-wider text-slate-400">
                AGUAD SUITE
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none uppercase">
              {t.auth.title}
            </h2>
            <p className="text-slate-400 text-xs font-medium leading-normal">
              {t.auth.subtitle}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginFormSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4.5 rounded-2xl flex items-start space-x-2.5 text-xs animate-fade-in" id="login-error-display">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-semibold leading-normal">{error}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.auth.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@aguadbienesraices.com.ar"
                    className="w-full pl-11 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                    required
                    id="login-email-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                    required
                    id="login-password-input"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={btnSubmitting}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md shadow-teal-500/10 flex items-center justify-center space-x-2 transition cursor-pointer"
              id="login-submit-btn"
            >
              {btnSubmitting ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>{t.auth.submit}</span>
              )}
            </button>
          </form>

          <div className="space-y-3 pt-2">
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setShowForgotMsg(!showForgotMsg)}
                className="text-xs text-slate-400 hover:text-teal-500 transition font-semibold"
                id="forgot-password-btn"
              >
                {t.auth.forgot}
              </button>
            </div>

            {showForgotMsg && (
              <div className="bg-teal-50/70 border border-teal-100 text-teal-800 p-4 rounded-2xl text-xs text-center animate-fade-in dark:bg-teal-950/20 dark:border-teal-900 dark:text-teal-300">
                Para recuperar su contraseña de acceso, por favor póngase en contacto directo con soporte de administración.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD LAYOUT (Fase 3 & Rule 15/16)
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-600 dark:bg-slate-950 font-sans" id="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Screen Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Dynamic header navigation */}
        <TopBar 
          currentTab={currentTab} 
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Scrollable Viewstage */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/40 dark:bg-slate-950/20" id="main-viewstage">
          <div className="w-full max-w-7xl mx-auto">
            {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
            {currentTab === 'properties' && <PropertiesView />}
            {currentTab === 'aguadi' && <AguadiCabinetView />}
            {currentTab === 'users' && <UsersView />}
            {currentTab === 'audit' && <AuditLogsView />}
            {currentTab === 'firebase-admin' && <FirebaseAdminView />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
