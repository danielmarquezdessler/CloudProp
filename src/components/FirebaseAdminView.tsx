import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Terminal, 
  Server, 
  Database, 
  Cpu, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Info, 
  Play, 
  Plus, 
  Trash2,
  Bookmark
} from "lucide-react";
import { Property } from "../types";

export const FirebaseAdminView: React.FC = () => {
  const { user, apiFetch, t } = useAuth();
  
  // Statuses
  const [functionsStatus, setFunctionsStatus] = useState<"untested" | "loading" | "success" | "error">("untested");
  const [functionsPingMsg, setFunctionsPingMsg] = useState<string>("");
  
  // Firestore Admin Reads/Writes
  const [firestoreProperties, setFirestoreProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState<boolean>(false);
  const [savingProperty, setSavingProperty] = useState<boolean>(false);
  const [propTitle, setPropTitle] = useState<string>("");
  const [propPrice, setPropPrice] = useState<string>("");
  const [propAddress, setPropAddress] = useState<string>("");
  const [propType, setPropType] = useState<"house" | "apartment" | "commercial" | "land">("house");
  
  // Cloud Function getPropertyStats
  const [statsResult, setStatsResult] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  
  // Simulated Auth trigger
  const [triggerUid, setTriggerUid] = useState<string>("test-user-" + Math.random().toString(36).substr(2, 5));
  const [triggerEmail, setTriggerEmail] = useState<string>("simulated.user@aguad.com");
  const [triggerName, setTriggerName] = useState<string>("Simulado Aguad");
  const [triggerResult, setTriggerResult] = useState<any>(null);
  const [triggeringAuth, setTriggeringAuth] = useState<boolean>(false);
  
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Load Firestore Properties via Admin SDK
  const loadAdminFirestoreProperties = async () => {
    setLoadingProperties(true);
    setErrorText(null);
    try {
      if (!user?.orgId) throw new Error("Falta orgId en el perfil autenticado. No se usará un fallback de organización.");
      const res = await apiFetch("/api/admin-firestore/properties?orgId=" + encodeURIComponent(user.orgId));
      const data = await res.json();
      if (data.success) {
        setFirestoreProperties(data.properties || []);
      } else {
        throw new Error(data.error || "Failed to retrieve properties via Admin SDK");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Ping Cloud Function
  const testCloudFunctionsPing = async () => {
    setFunctionsStatus("loading");
    setFunctionsPingMsg("");
    try {
      const res = await apiFetch("/api/functions/ping");
      const data = await res.json();
      setFunctionsStatus("success");
      setFunctionsPingMsg(data.message || "Reachability check complete!");
    } catch (err: any) {
      setFunctionsStatus("error");
      setFunctionsPingMsg(err.message || "XHR connection failed");
    }
  };

  // Run Simulated Stats calculated via Cloud Functions
  const runGetPropertyStatsFunction = async () => {
    setLoadingStats(true);
    setStatsResult(null);
    try {
      if (!user?.orgId) throw new Error("Falta orgId en el perfil autenticado. No se usará un fallback de organización.");
      const res = await apiFetch("/api/functions/getPropertyStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: user?.orgId })
      });
      const data = await res.json();
      setStatsResult(data);
    } catch (err: any) {
      setStatsResult({ success: false, error: err.message });
    } finally {
      setLoadingStats(false);
    }
  };

  // Add random/mock Property using Firebase Admin SDK 
  const handleSavePropertyViaAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propTitle.trim()) return;
    if (!user?.orgId) {
      setErrorText("Falta orgId en el perfil autenticado. No se usará un fallback de organización.");
      return;
    }
    setSavingProperty(true);
    try {
      const id = "prop-admin-" + Date.now();
      const payload: Partial<Property> & { id: string } = {
        id,
        title: propTitle.trim(),
        description: "Creado desde la Suite de Administración utilizando el Firebase Admin SDK.",
        type: propType,
        price: Number(propPrice) || 120000,
        address: propAddress.trim() || "Dirección de Pruebas Admin 123",
        status: "available",
        bedrooms: 3,
        bathrooms: 2,
        areaSqM: 150,
        orgId: user?.orgId,
        createdBy: user?.uid || "admin-system",
        createdAt: new Date().toISOString()
      };

      const res = await apiFetch("/api/admin-firestore/properties/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessText("Propiedad guardada exitosamente en Firestore usando Firebase Admin SDK.");
        setTimeout(() => setSuccessText(null), 4000);
        setPropTitle("");
        setPropPrice("");
        setPropAddress("");
        loadAdminFirestoreProperties();
      } else {
        throw new Error(data.error || "Save action failed");
      }
    } catch (err: any) {
      setErrorText(err.message);
    } finally {
      setSavingProperty(false);
    }
  };

  // Delete matching property
  const handleDeletePropertyViaAdmin = async (id: string) => {
    try {
      const res = await apiFetch("/api/admin-firestore/properties/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessText("Propiedad eliminada de Firestore mediante el Firebase Admin SDK.");
        setTimeout(() => setSuccessText(null), 4000);
        loadAdminFirestoreProperties();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorText(err.message);
    }
  };

  // Simulate onUserCreated Trigger function
  const triggerUserCreatedSimulation = async () => {
    setTriggeringAuth(true);
    setTriggerResult(null);
    try {
      const res = await apiFetch("/api/functions/trigger/userCreated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: triggerUid,
          email: triggerEmail,
          displayName: triggerName
        })
      });
      const data = await res.json();
      setTriggerResult(data);
      if (data.success) {
        // Regenerate pre-seeded uid for next test
        setTriggerUid("test-user-" + Math.random().toString(36).substr(2, 5));
      }
    } catch (err: any) {
      setTriggerResult({ success: false, error: err.message });
    } finally {
      setTriggeringAuth(false);
    }
  };

  useEffect(() => {
    loadAdminFirestoreProperties();
    testCloudFunctionsPing();
  }, []);

  return (
    <div className="space-y-6" id="firebase-admin-playground">
      
      {/* Overview Card */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
          <Terminal className="w-64 h-64" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[9px] font-bold tracking-widest uppercase bg-teal-950 text-teal-400 border border-teal-800/60 px-2 rounded-full font-mono">
              Entorno Seguro de Pruebas
            </span>
            <h2 className="text-xl font-bold tracking-tight mt-2 text-white">
              Arquitectura de Servidor Firebase para 'Aguad CloudProp Suite'
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Consola interactiva de inicialización y sincronización. Permite verificar la conexión al SDK, probar escrituras de Firestore Admin escalables y simular la activación y llamada a Cloud Functions.
            </p>
          </div>
          <div className="shrink-0 flex gap-2">
            <button 
              onClick={() => {
                loadAdminFirestoreProperties();
                testCloudFunctionsPing();
              }}
              className="p-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-xl text-teal-400 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar Panel
            </button>
          </div>
        </div>
      </div>

      {errorText && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start space-x-2 text-xs text-rose-700 font-semibold leading-normal">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>Error: {errorText}</span>
        </div>
      )}

      {successText && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start space-x-2 text-xs text-emerald-800 font-semibold leading-normal">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successText}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Firestore Admin SDK Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-slate-800">
            <Database className="w-5 h-5 text-teal-500" />
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Lectura y Escritura: Firebase Admin SDK</h3>
              <p className="text-[10px] text-slate-400 font-mono">FIRESTORE DIRECT COLLECTION WRITES</p>
            </div>
          </div>

          {/* Form to save property directly to Firestore via Admin SDK */}
          <form onSubmit={handleSavePropertyViaAdmin} className="space-y-4 bg-slate-50 p-4 rounded-2xl dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-teal-500" /> Registrar Propiedad Mediante Admin SDK
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Título</label>
                <input 
                  type="text" 
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  placeholder="Ej: Terreno Premium Lomas"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Precio (USD/Mondo)</label>
                <input 
                  type="number" 
                  value={propPrice}
                  onChange={(e) => setPropPrice(e.target.value)}
                  placeholder="Ej: 350000"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Dirección</label>
                <input 
                  type="text" 
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  placeholder="Ej: Av Libertador 4200, CABA"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Tipo de Inmueble</label>
                <select 
                  value={propType}
                  onChange={(e) => setPropType(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="house">Casa</option>
                  <option value="apartment">Departamento</option>
                  <option value="commercial">Oficina Comercial</option>
                  <option value="land">Terreno Lote</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={savingProperty}
              className="w-full py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingProperty ? "Escribiendo en Firestore..." : "Registrar via Admin SDK"}
            </button>
          </form>

          {/* List of properties read via Admin SDK */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Propiedades en Firestore (Sincronizado vía Admin Reader)
            </h4>
            
            {loadingProperties ? (
              <div className="py-8 text-center text-xs text-slate-400">Cargando registros persistentes...</div>
            ) : firestoreProperties.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                No se encontraron propiedades registradas en Firestore. ¡Crea una para comenzar la verificación!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {firestoreProperties.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-850">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 font-mono text-[8px] font-bold rounded uppercase">
                          {p.type}
                        </span>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate">{p.title}</h5>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.address}</p>
                      <p className="text-[10px] text-teal-600 font-bold font-mono mt-1">USD {Number(p.price).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleDeletePropertyViaAdmin(p.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors ml-2"
                      title="Eliminar usando Admin SDK"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cloud Functions Simulator Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 dark:bg-slate-900 dark:border-slate-800">
          
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-50 dark:border-slate-800">
            <Cpu className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Ejecución y Triggers: Cloud Functions</h3>
              <p className="text-[10px] text-slate-400 font-mono">MOCK / LIVE FUNCTION CONTROLLERS</p>
            </div>
          </div>

          {/* Cloud Functions Ping Validation Status */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">Estado de Cloud Functions HTTP</h4>
              <p className="text-[10px] text-slate-400 leading-normal">Reachability endpoint: /api/functions/ping</p>
              {functionsPingMsg && (
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-mono mt-1 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200/50 leading-relaxed">
                  {functionsPingMsg}
                </p>
              )}
            </div>
            
            <button 
              onClick={testCloudFunctionsPing}
              disabled={functionsStatus === "loading"}
              className="p-1.5 bg-white border border-slate-250 hover:bg-slate-100 rounded-lg transition shrink-0 ml-2"
            >
              {functionsStatus === "loading" ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              ) : functionsStatus === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : functionsStatus === "error" ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <Play className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>

          {/* Callable function test: getPropertyStats */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase">Callable: getPropertyStats</h4>
              <button 
                onClick={runGetPropertyStatsFunction}
                disabled={loadingStats}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/25 dark:hover:bg-purple-900/30 text-purple-600 text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-colors uppercase cursor-pointer"
              >
                {loadingStats ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Calcular Métricas
              </button>
            </div>

            {statsResult && (
              <div className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-[10px] leading-relaxed max-h-52 overflow-y-auto">
                <span className="text-purple-400 block mb-1 font-bold">// Response Payload:</span>
                {JSON.stringify(statsResult, null, 2)}
              </div>
            )}
          </div>

          {/* Auth trigger test onUserCreated */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase">Simular Trigger: auth().onCreate()</h4>
              <p className="text-[10px] text-slate-400">Verifica la inicialización del Admin SDK salvando automáticamente un perfil tras login seguro.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="space-y-0.5">
                  <label className="text-[9px] text-slate-400 font-bold block uppercase">GUID de Registro</label>
                  <input 
                    type="text" 
                    value={triggerUid} 
                    onChange={e => setTriggerUid(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-200"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] text-slate-400 font-bold block uppercase">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={triggerEmail} 
                    onChange={e => setTriggerEmail(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] text-slate-400 font-bold block uppercase font-mono">Display Name</label>
                <input 
                  type="text" 
                  value={triggerName} 
                  onChange={e => setTriggerName(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-200"
                />
              </div>

              <button 
                onClick={triggerUserCreatedSimulation}
                disabled={triggeringAuth}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {triggeringAuth ? "Disparando Evento..." : "Disparar Trigger de Creación"}
              </button>

              {triggerResult && (
                <div className="p-3 bg-slate-900 text-teal-400 rounded-lg font-mono text-[9px] leading-relaxed">
                  <span className="text-teal-400 block font-bold mb-0.5">// Auth Register Trigger Result:</span>
                  {JSON.stringify(triggerResult, null, 2)}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
