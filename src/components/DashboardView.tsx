import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Users, 
  Settings, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  ShieldAlert,
  AlertCircle,
  Sparkles,
  Brain,
  Cpu,
  Coins,
  Activity,
  FileText,
  Check,
  Copy,
  ChevronRight,
  UserCheck,
  Flame,
  Scale,
  Globe,
  ArrowRight
} from 'lucide-react';
import { User, Property, AuditLog } from '../types';

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, apiFetch, t } = useAuth();
  
  // Stats state
  const [stats, setStats] = useState({
    propertiesCount: 0,
    usersCount: 0,
    logsCount: 0,
    leadsProcessed: 28,
    averageLeadScore: 78
  });
  
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- INTERACTIVE TOOL 1: MULTILINGUAL PORTAL SYNTHESIZER ---
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [syncedPropertyDetails, setSyncedPropertyDetails] = useState<string>('');
  const [generatedFicha, setGeneratedFicha] = useState<string>('');
  const [fichaLoading, setFichaLoading] = useState(false);
  const [fichaError, setFichaError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // --- INTERACTIVE TOOL 2: LEAD COACH & COGNITIVE ANALYSIS ---
  const [rawLeadMessage, setRawLeadMessage] = useState<string>('');
  const [leadAnalysis, setLeadAnalysis] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- INTERACTIVE TOOL 3: PREDICTIVE VALUATION (TASADOR AI) ---
  const [valuZone, setValuZone] = useState<string>('Yerba Buena');
  const [valuArea, setValuArea] = useState<number>(120);
  const [valuBeds, setValuBeds] = useState<number>(3);
  const [valuPropType, setValuPropType] = useState<string>('casa');
  const [valuDesc, setValuDesc] = useState<string>('Excelente iluminación, cochera techada para 2 autos, jardín con piscina pequeña.');
  const [valuReport, setValuReport] = useState<string>('');
  const [valuLoading, setValuLoading] = useState(false);
  const [valuError, setValuError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch properties
        const propRes = await apiFetch('/api/properties');
        const propData = await propRes.json();
        
        let usersData = { success: false, users: [] };
        let logsData = { success: false, logs: [] };

        // Fetch users if super_admin
        if (user.role === 'super_admin') {
          const usrRes = await apiFetch('/api/users');
          usersData = await usrRes.json();

          const logRes = await apiFetch('/api/audit-logs');
          logsData = await logRes.json();
        }

        const validProps = propData.properties || [];
        const validUsers = usersData.users || [];
        const validLogs = logsData.logs || [];

        setAllProperties(validProps);
        if (validProps.length > 0) {
          setSelectedPropertyId(validProps[0].id);
        }

        setStats({
          propertiesCount: validProps.length,
          usersCount: user.role === 'super_admin' ? validUsers.length : 3,
          logsCount: user.role === 'super_admin' ? validLogs.length : 12,
          leadsProcessed: 42,
          averageLeadScore: 84
        });

        setRecentProperties(validProps.slice(0, 3));
        if (user.role === 'super_admin') {
          setRecentLogs(validLogs.slice(0, 5));
        }

      } catch (err: any) {
        console.error("Error loading dashboard data:", err);
        setError(err.message || t.common.error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Handle Tool 1: generate multilingual brochure
  const handleGenerateFicha = async () => {
    const prop = allProperties.find(p => p.id === selectedPropertyId);
    if (!prop) {
      setFichaError("Por favor, selecciona una propiedad válida.");
      return;
    }

    setFichaLoading(true);
    setFichaError(null);
    setGeneratedFicha('');

    try {
      const res = await apiFetch('/api/ai/generate-ficha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: prop.title,
          price: prop.price,
          address: prop.address,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          areaSqM: prop.areaSqM,
          description: prop.description
        })
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedFicha(data.brochure);
      } else {
        setFichaError(data.error || "Ocurrió un error al compilar el folleto con IA.");
      }
    } catch (err: any) {
      setFichaError(err.message || "Fallo en la comunicación con el servidor de IA.");
    } finally {
      setFichaLoading(false);
    }
  };

  // Handle Tool 2: Lead coach analysis
  const handleAnalyzeLead = async () => {
    if (!rawLeadMessage.trim()) {
      setAnalysisError("Por favor ingresa un mensaje para analizar.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setLeadAnalysis(null);

    try {
      const res = await apiFetch('/api/ai/analyze-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: rawLeadMessage })
      });

      const data = await res.json();
      if (data.success) {
        setLeadAnalysis(data.analysis);
      } else {
        setAnalysisError(data.error || "No se pudo realizar el análisis del lead.");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Fallo técnico en la llamada al motor predictivo.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Handle Tool 3: Predictive Appraisal
  const handleTasar = async () => {
    if (!valuZone.trim() || !valuArea) {
      setValuError("Completa la zona y la superficie obligatoriamente.");
      return;
    }

    setValuLoading(true);
    setValuError(null);
    setValuReport('');

    try {
      const res = await apiFetch('/api/ai/tasar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          zone: valuZone,
          areaSqM: valuArea,
          bedrooms: valuBeds,
          propertyType: valuPropType,
          description: valuDesc
        })
      });

      const data = await res.json();
      if (data.success) {
        setValuReport(data.report);
      } else {
        setValuError(data.error || "No se pudo calcular la tasación predictiva.");
      }
    } catch (err: any) {
      setValuError(err.message || "Error al conectar con el servidor de análisis regional.");
    } finally {
      setValuLoading(false);
    }
  };

  const handleCopyClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const loadExampleLead = (message: string) => {
    setRawLeadMessage(message);
  };

  const leadExamples = [
    {
      label: "Comprador Yerba Buena",
      text: "Hola! Soy Martín. Vi el anuncio del depto en Yerba Buena de 2 dorms. Tengo presupuesto de unos USD 140.000 de contado. Dejo mi celular para armar una visita: 381445522. Gracias!"
    },
    {
      label: "Permuta / Venta Barrio Norte",
      text: "Buenas tardes, tengo una casa residencial de 4 habitaciones en Barrio Norte que quiero tasar y vender para comprar dos deptos más chicos. ¿Ustedes realizan tasaciones físicas?"
    },
    {
      label: "Alquiler Corporativo",
      text: "Hola, represento a una firma extranjera. Busco un inmueble comercial amplio o casa apto oficinas por el Centro. Firmamos contrato de inmediato por 3 años. Saludos!"
    }
  ];

  if (!user) return null;

  return (
    <div className="space-y-8 pb-12" id="dashboard-view">
      
      {/* Header Premium - Glassmorphism & Neon Aura */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 md:p-8 text-white shadow-2xl border border-slate-900">
        <div className="absolute top-0 right-0 -tralate-y-12 translate-x-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span className="inline-block text-[10px] font-black text-teal-400 bg-teal-950/40 border border-teal-800/80 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                AGENTE IA ACTIVO & CALIFICANDO LEADS EN TIEMPO REAL
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-none">
              Inmuebles & AI Control Room
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bienvenido, <strong className="text-teal-400 font-bold">{user.displayName}</strong>. Estás en la plataforma integrada de inteligencia artificial inmobiliaria de <strong className="text-white">Facundo Aguad Bienes Raíces</strong>. Todas tus interacciones de lead-routing y entrenamiento están aseguradas de forma síncrona.
            </p>
          </div>

          <div className="flex items-center space-x-3.5 bg-slate-900/80 border border-slate-800 p-4.5 rounded-2xl max-w-sm shrink-0 shadow-lg select-none">
            <Cpu className="w-8 h-8 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-widest block">NIVEL OPERANTE</span>
              <span className="text-xs text-slate-300 block font-semibold truncate leading-tight">
                {user.role === 'super_admin' ? 'Superadministrador Legal' : 'Agente Inmobiliario Autorizado'}
              </span>
              <span className="text-[10px] font-mono text-teal-400 font-semibold mt-0.5 block">ORG: {user.orgId.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex py-20 justify-center items-center flex-col space-y-3">
          <svg className="animate-spin h-9 w-9 text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">CARGANDO HUB DE OPERACIONES...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-950/20 border border-rose-800/60 p-5 rounded-2xl flex items-start space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="font-semibold leading-relaxed">No se pudo cargar el estado actual del Hub: {error}</span>
        </div>
      ) : (
        <>
          {/* Actionable Bento KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  SISTEMA INMUEBLES
                </span>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
                  {stats.propertiesCount}
                </p>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block bg-teal-50 dark:bg-teal-950/20 px-1.5 py-0.5 rounded w-max">
                  Sincronizado
                </span>
              </div>
              <div className="p-3 bg-teal-50 text-teal-500 rounded-2xl dark:bg-slate-800 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  LEADS CAPTURADOS
                </span>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
                  {stats.leadsProcessed}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded w-max">
                  IA Activa
                </span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-slate-800 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  SCORE PROMEDIO
                </span>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
                  {stats.averageLeadScore}%
                </p>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded w-max">
                  Calificación Alta
                </span>
              </div>
              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl dark:bg-slate-800 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  OPERACIONES AUDITADAS
                </span>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
                  {stats.logsCount}
                </p>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block bg-purple-50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded w-max font-mono">
                  Transparente
                </span>
              </div>
              <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl dark:bg-slate-800 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* AI COGNITIVE POWER TOOLS SECTION */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" />
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                Herramientas de Inteligencia Cognitiva AI
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Ejecuta flujos integrados de procesamiento sintético en base a tu base de datos y modelos predictivos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* BENTO TOOL 1: MULTILINGUAL AI BROCHURE GENERATOR */}
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 rounded-xl text-teal-400 border border-teal-500/30">
                      <Globe className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight uppercase leading-none">Sintetizador de Folletos Tri-Idioma</h3>
                      <span className="text-[9px] text-slate-500 font-mono tracking-wider">GEMINI MULTILINGUAL BROCHURE COMPIILER</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold font-mono tracking-widest text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                    LISTINGS-READY
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Exporta una ficha de propiedad instantánea y de alta conversión adaptada nativamente a <strong>Español 🇦🇷, Inglés 🇬🇧 y Portugués 🇧🇷</strong> usando la información de tu cartera de inmuebles.
                </p>

                {allProperties.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center flex flex-col items-center justify-center space-y-1.5 py-8">
                    <Building2 className="w-8 h-8 text-slate-700" />
                    <p className="text-xs font-semibold text-slate-400">No hay inmuebles disponibles en tu catálogo todavía.</p>
                    <p className="text-[10px] text-slate-550">Ingresa a la sección "Propiedades" para crear tu primer listado multitenant.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Selecciona Propiedad de tu Base de Datos</label>
                      <select 
                        value={selectedPropertyId} 
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer text-slate-200"
                      >
                        {allProperties.map(p => (
                          <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">
                            {p.title} - USD {p.price.toLocaleString()} ({p.address})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={handleGenerateFicha}
                      disabled={fichaLoading}
                      className="w-full h-10 bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {fichaLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>SINTETIZANDO CON INTELIGENCIA GEOLOCALIZADA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-white" />
                          <span>GENERAR PROPAGANDA MULTILENGUAJE AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Outputs Container */}
              <div className="mt-6 flex-1 flex flex-col justify-end">
                {fichaError && (
                  <div className="p-3.5 bg-rose-950/20 border border-rose-800/60 rounded-xl flex items-start space-x-2 text-[11px] text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Error: {fichaError}</span>
                  </div>
                )}

                {generatedFicha && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-400 font-mono">REDACTADO INTEGRAL COMPLETO</span>
                      <button 
                        onClick={() => handleCopyClipboard(generatedFicha, 'ficha')}
                        className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 flex items-center space-x-1 transition cursor-pointer"
                      >
                        {copiedSection === 'ficha' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-teal-400" />
                            <span className="text-teal-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Todo</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800/85 p-4 rounded-xl text-xs overflow-y-auto max-h-60 text-slate-300 font-sans leading-relaxed whitespace-pre-wrap select-text">
                      {generatedFicha}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BENTO TOOL 2: LEAD COACH & COGNITIVE ANALYSIS */}
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-gradient-to-tr from-rose-500/20 to-teal-500/20 rounded-xl text-rose-400 border border-rose-500/30">
                      <Brain className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight uppercase leading-none">Analizador de Leads & Conversaciones</h3>
                      <span className="text-[9px] text-slate-500 font-mono tracking-wider">COGNITIVE LEAD PARSER & SCORING GAUGES</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold font-mono tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                    INTERACTIVE
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Pega el mensaje crudo que te envió un cliente por redes o WhatsApp para que la IA extraiga perfiles, estime su temperatura comercial, asigne un score y dicte su próxima mejor acción.
                </p>

                <div className="space-y-4">
                  {/* Quick Examples Selection */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider block">Plantillas de Prueba Inmediata:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {leadExamples.map((ex, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => loadExampleLead(ex.text)}
                          className="px-2.5 py-1 text-[9px] font-medium bg-slate-950 border border-slate-800 text-slate-300 rounded-lg hover:text-white hover:border-slate-700 transition cursor-pointer"
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Element */}
                  <div className="space-y-1.5">
                    <textarea 
                      value={rawLeadMessage}
                      onChange={(e) => setRawLeadMessage(e.target.value)}
                      placeholder="Pega un mensaje aquí (ej: 'Hola, buenas. Quería consultar por la casa de Yerba Buena de 3 dorms. Mi presupuesto es 180k usd, dejo mi celu 381...')"
                      rows={3}
                      className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-200 resize-none font-sans leading-relaxed"
                    />
                  </div>

                  <button 
                    onClick={handleAnalyzeLead}
                    disabled={analysisLoading}
                    className="w-full h-10 bg-gradient-to-r from-rose-500 to-teal-500 hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {analysisLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>CORRIENDO ANÁLISIS COGNITIVO ...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 text-white" />
                        <span>DIAGNOSTICAR LEAD CON INTELIGENCIA ARTIFICIAL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Analysis Output display */}
              <div className="mt-5 flex-1 flex flex-col justify-end">
                {analysisError && (
                  <div className="p-3.5 bg-rose-950/20 border border-rose-800/60 rounded-xl text-[11px] text-rose-300">
                    <span>Error: {analysisError}</span>
                  </div>
                )}

                {leadAnalysis && (
                  <div className="mt-4 p-4.5 bg-slate-950 border border-slate-800/85 rounded-xl space-y-4 animate-fade-in text-xs select-text">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <h4 className="font-bold text-teal-400 uppercase tracking-tight text-[11px] font-mono flex items-center space-x-1">
                        <span>ESTUDIO PREDICTIVO CONCLUIDO</span>
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                        leadAnalysis.temp === 'Caliente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        leadAnalysis.temp === 'Tibia' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        Témpora: {leadAnalysis.temp}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Nombre</span>
                        <span className="font-bold text-white text-xs">{leadAnalysis.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Teléfono</span>
                        <span className="font-bold text-white text-xs font-mono">{leadAnalysis.phone}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Operación</span>
                        <span className="font-bold text-teal-300 text-xs uppercase">{leadAnalysis.operationType}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Inmueble</span>
                        <span className="font-bold text-teal-300 text-xs uppercase">{leadAnalysis.propertyType}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Zona Interés</span>
                        <span className="font-semibold text-slate-300 text-xs">{leadAnalysis.zone}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Presupuesto</span>
                        <span className="font-mono text-emerald-400 text-xs font-bold">{leadAnalysis.budget}</span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 uppercase font-mono">Lead Score de Confianza</span>
                        <span className="font-bold text-teal-400 font-mono">{leadAnalysis.score}/100</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-teal-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${leadAnalysis.score}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg space-y-1 border border-slate-800/70">
                      <strong className="text-[9px] text-slate-500 uppercase font-mono block">Resumen Comercial</strong>
                      <p className="text-[11px] text-slate-350 leading-relaxed font-sans">{leadAnalysis.summary}</p>
                    </div>

                    <div className="p-3 bg-teal-950/20 border border-teal-800/10 rounded-lg space-y-1 text-[11px] leading-relaxed">
                      <strong className="text-[9px] text-teal-400 uppercase font-mono block tracking-wide">Estrategia Táctica Sugerida</strong>
                      <p className="text-teal-300 font-medium font-sans">{leadAnalysis.nextStep}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* BENTO TOOL 3: VALUATION & PREDICTIVE APPRAISAL (TASADOR) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-5 h-5 text-teal-500" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Tasador de Mercado Predictivo AI</h3>
                      <span className="text-[9px] text-slate-400 font-mono uppercase block mt-0.5">ESTIMACIÓN DE VALOR E INFORME TÉCNICO REGIONAL</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold font-mono tracking-widest text-teal-600 bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                    TUCUMÁN / YERBA BUENA
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  Genera una tasación predictiva inmediata basada en las superficies residenciales medias en Yerba Buena, Barrio Norte, Centro y zonas premium del norte argentino.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Zona */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Zona Geográfica</label>
                    <input 
                      type="text" 
                      value={valuZone}
                      onChange={(e) => setValuZone(e.target.value)}
                      placeholder="Yerba Buena, Barrio Norte, Yerba Buena Golf, etc."
                      className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Property Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Tipo de Propiedad</label>
                    <select 
                      value={valuPropType}
                      onChange={(e) => setValuPropType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    >
                      <option value="casa">Casa Residencial</option>
                      <option value="departamento">Departamento / Flat</option>
                      <option value="terreno">Lote de Terreno / Country</option>
                      <option value="comercial">Local Comercial / Oficinas</option>
                    </select>
                  </div>

                  {/* Area */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Superficie Cubierta (m²)</label>
                    <input 
                      type="number" 
                      value={valuArea}
                      onChange={(e) => setValuArea(Number(e.target.value))}
                      placeholder="120"
                      className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Bed Rooms */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Dormitorios</label>
                    <input 
                      type="number" 
                      value={valuBeds}
                      onChange={(e) => setValuBeds(Number(e.target.value))}
                      placeholder="3"
                      className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Comentarios del Estado o Terminaciones</label>
                    <input 
                      type="text" 
                      value={valuDesc}
                      onChange={(e) => setValuDesc(e.target.value)}
                      placeholder="Buen estado, cocina refaccionada, suite con vestidor, etc."
                      className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleTasar}
                  disabled={valuLoading}
                  className="w-full mt-4 h-10 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700/80 disabled:opacity-50"
                >
                  {valuLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>COMPUTANDO VALUACIÓN DE MERCADO REGIONAL...</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-4 h-4 text-teal-400 animate-pulse" />
                      <span className="text-teal-400">TASAR INMUEBLE CON INTELIGENCIA GEOLOCALIZADA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Appraisal Output container */}
              <div className="mt-5 flex-1 flex flex-col justify-end">
                {valuError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                    <span>{valuError}</span>
                  </div>
                )}

                {valuReport && (
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-wide uppercase">Tasación y Reporte Regional Generado</span>
                      <button 
                        onClick={() => handleCopyClipboard(valuReport, 'valu')}
                        className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white border border-slate-100 dark:border-slate-850 px-2.5 py-1 rounded-md flex items-center space-x-1 transition cursor-pointer"
                      >
                        {copiedSection === 'valu' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-teal-600" />
                            <span className="text-teal-600">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Reporte</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 max-h-60 overflow-y-auto leading-relaxed text-slate-650 p-4 rounded-xl dark:bg-slate-950 dark:border-slate-850 dark:text-slate-300 font-sans whitespace-pre-wrap select-text">
                      {valuReport}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BENTO SIDE COLUMN: CABINA AGUADI MONITOR & SHIFT LINK */}
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-3xl p-6 border border-slate-900 shadow-lg flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-800/40 animate-pulse">
                      <Activity className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-tight leading-none">Cabina AGUADI 24/7</h3>
                      <span className="text-[9px] font-mono text-teal-400 font-bold block mt-0.5">Asistente Autónomo Activo</span>
                    </div>
                  </div>
                  <span className="bg-teal-950/40 text-teal-400 border border-teal-800/60 px-2 py-0.5 text-[9px] rounded-md font-mono font-bold uppercase shrink-0">
                    ONLINE
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Tu asistente conversacional está conectado al canal de chat y webhook oficial. Monitorea actividades del simulador de WhatsApp, califica leads y aplica directivas institucionales.
                </p>

                {/* Automation Mini-Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-900/60 border border-slate-850/60 rounded-xl">
                    <span className="text-[9px] text-slate-550 block font-mono uppercase">Eficacia IA</span>
                    <span className="text-sm font-black text-white font-mono block">98.4%</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-850/60 rounded-xl">
                    <span className="text-[9px] text-slate-550 block font-mono uppercase">Status Widget</span>
                    <span className="text-sm font-black text-emerald-400 font-mono block">Conectado</span>
                  </div>
                </div>

                {/* Audit quick log feeds */}
                <div className="space-y-2.5 pt-2">
                  <strong className="text-[9px] text-slate-500 uppercase tracking-widest block font-mono">Stream de Automatizaciones</strong>
                  <div className="space-y-2 text-[11px] font-sans">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="text-slate-400 shrink-0 font-mono">08:31</span>
                      <p className="truncate">Lead <strong className="text-teal-400">Martín</strong> calificado exitosamente (Score 85/100).</p>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="text-slate-400 shrink-0 font-mono">08:15</span>
                      <p className="truncate">WhatsApp Hook verificado de forma síncrona en servidor.</p>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="text-slate-400 shrink-0 font-mono">07:58</span>
                      <p className="truncate">Conversación iniciada desde el Widget Web Chat del cliente.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                {onNavigate && (
                  <button 
                    onClick={() => onNavigate('aguadi')}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-teal-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <span>Configurar Cabina & Simulador Chats</span>
                    <ArrowRight className="w-4 h-4 text-teal-400" />
                  </button>
                )}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Properties Catalog preview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-tight">
                  Inmuebles Autorizados en Organizacion
                </h3>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded-md">
                  VISTA EN TENANT
                </span>
              </div>
              {recentProperties.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400" id="empty-dashboard-properties">
                  {t.properties.empty_state}
                </div>
              ) : (
                <div className="space-y-3.5 mt-4">
                  {recentProperties.map((p) => (
                    <div key={p.id} className="flex space-x-3.5 items-center p-2 rounded-xl hover:bg-slate-50/50 transition duration-150 dark:hover:bg-slate-800/30">
                      <img 
                        src={p.imageUrl} 
                        alt={p.title} 
                        referrerPolicy="no-referrer"
                        className="w-16 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-800 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{p.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.address}</p>
                        <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-1 font-mono">
                          USD {p.price.toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md shrink-0 ${
                        p.status === 'available' ? 'bg-teal-50 text-teal-605 dark:bg-teal-950/20 dark:text-teal-400' :
                        p.status === 'reserved' ? 'bg-amber-50 text-amber-605 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {p.status === 'available' ? t.properties.statuses.available : p.status === 'reserved' ? t.properties.statuses.reserved : t.properties.statuses.sold}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Log timeline */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-tight">
                  Auditoría General Reciente
                </h3>
                <span className="text-xs font-bold text-rose-500 font-mono uppercase bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md">
                  CUMPLIMIENTO DE SEGURIDAD
                </span>
              </div>

              {user.role !== 'super_admin' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-amber-500 opacity-60 animate-pulse" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
                    Los registros de auditoría detallados de base de datos están restringidos a cuentas de nivel <strong className="text-rose-500 font-mono">super_admin</strong> por políticas de seguridad del producto.
                  </p>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t.logs.empty}
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex space-x-3 items-start text-xs border-b border-slate-50 pb-3 last:border-b-0 dark:border-slate-800">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        log.action === 'create' ? 'bg-teal-55 text-teal-605 dark:bg-teal-950/25' :
                        log.action === 'delete' ? 'bg-rose-55 text-rose-650 dark:bg-rose-950/25' :
                        log.action === 'login' ? 'bg-blue-55 text-blue-650 dark:bg-blue-950/25' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-450'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 leading-normal">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800 dark:text-slate-150 truncate max-w-[150px] sm:max-w-xs">{log.userEmail}</p>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">{log.timestamp.replace('T', ' ').substring(11, 19)}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{log.details}</p>
                        <span className="text-[9px] font-mono uppercase bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 text-slate-400 mt-1 inline-block px-1 rounded">
                          {log.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </>
      )}

    </div>
  );
};
