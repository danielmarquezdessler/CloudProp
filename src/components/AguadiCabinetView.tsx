import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, 
  Send, 
  Radio, 
  ShieldCheck, 
  Palette, 
  Sparkles, 
  Activity, 
  Plus, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  UserCheck, 
  RefreshCw, 
  Layers, 
  FileText,
  Sliders,
  Settings,
  X,
  MessageSquare,
  Building2,
  Star
} from 'lucide-react';
import { 
  AguadiSettings, 
  AguadiConversation, 
  AguadiMessage, 
  AguadiLead, 
  AguadiWidgetConfig, 
  AguadiRoutingRule, 
  AguadiTrainingRule, 
  AguadiResponseTemplate, 
  AguadiEvent 
} from '../types';
import { AGUADI_ZAP_DISPLAY_NAME, AGUADI_ZAP_MODULE_NAME } from '../../shared/aguadiZap';

export const AguadiCabinetView: React.FC = () => {
  const { user } = useAuth();
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'leads' | 'rules' | 'widget' | 'telemetry'>('simulator');

  // AGUADI ZAP Configuration States
  const [settings, setSettings] = useState<AguadiSettings | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<AguadiWidgetConfig | null>(null);
  
  const [routingRules, setRoutingRules] = useState<AguadiRoutingRule[]>([]);
  const [trainingRules, setTrainingRules] = useState<AguadiTrainingRule[]>([]);
  const [responseTemplates, setResponseTemplates] = useState<AguadiResponseTemplate[]>([]);
  
  const [conversations, setConversations] = useState<AguadiConversation[]>([]);
  const [messages, setMessages] = useState<AguadiMessage[]>([]);
  const [leads, setLeads] = useState<AguadiLead[]>([]);
  
  const [telemetryEvents, setTelemetryEvents] = useState<AguadiEvent[]>([]);
  const [metricsSummary, setMetricsSummary] = useState<any>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Selected entities for simulator
  const [selectedConversation, setSelectedConversation] = useState<AguadiConversation | null>(null);
  const [simulatedPhone, setSimulatedPhone] = useState<string>('+5493816551234');
  const [simulatedText, setSimulatedText] = useState<string>('Hola, estoy interesado en comprar una casa de 3 dormitorios con cochera en Yerba Buena. Mi presupuesto máximo es de USD 150000. Gracias, soy Carlos Gómez.');
  const [simulatedChannel, setSimulatedChannel] = useState<'whatsapp' | 'widget'>('whatsapp');
  
  // Rule Creation States
  const [newRuleType, setNewRuleType] = useState<'operationType' | 'budget' | 'zone' | 'propertyType'>('operationType');
  const [newRuleValue, setNewRuleValue] = useState<string>('compra');
  const [newRuleAgent, setNewRuleAgent] = useState<string>('agent-default');
  const [newRuleName, setNewRuleName] = useState<string>('Ruta de Compras');
  const [newRulePriority, setNewRulePriority] = useState<number>(10);

  // Template Creation States
  const [newTplTitle, setNewTplTitle] = useState<string>('');
  const [newTplCategory, setNewTplCategory] = useState<string>('General');
  const [newTplText, setNewTplText] = useState<string>('');

  // Context Injection States
  const [newTrainKeyword, setNewTrainKeyword] = useState<string>('');
  const [newTrainInstruction, setNewTrainInstruction] = useState<string>('');

  // Widget preview active inside customizer
  const [widgetPreviewOpen, setWidgetPreviewOpen] = useState<boolean>(false);
  const [widgetInputText, setWidgetInputText] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch full AGUADI ZAP configuration
  const fetchAguadiData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      const headers: any = {
        'Content-Type': 'application/json',
        'x-user-uid': user?.uid || ''
      };

      // 1. Fetch settings (which return settings, widget, routing, training, templates)
      const settingsRes = await fetch('/api/aguadi/settings', { headers });
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.settings);
        setWidgetConfig(settingsData.widget);
        setRoutingRules(settingsData.routingRules || []);
        setTrainingRules(settingsData.trainingRules || []);
        setResponseTemplates(settingsData.responseTemplates || []);
      }

      // 2. Fetch conversations
      const convsRes = await fetch('/api/aguadi/conversations', { headers });
      const convsData = await convsRes.json();
      if (convsData.success) {
        setConversations(convsData.conversations || []);
        // Auto select first conversation if available
        if (convsData.conversations?.length > 0 && !selectedConversation) {
          setSelectedConversation(convsData.conversations[0]);
        }
      }

      // 3. Fetch leads
      const leadsRes = await fetch('/api/aguadi/leads', { headers });
      const leadsData = await leadsRes.json();
      if (leadsData.success) {
        setLeads(leadsData.leads || []);
      }

      // 4. Fetch telemetry metrics
      const metricsRes = await fetch('/api/aguadi/metrics', { headers });
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setTelemetryEvents(metricsData.events || []);
        setMetricsSummary(metricsData.summary || null);
      }

    } catch (err: any) {
      console.error("[AGUADI ZAP Cabin] Load Error:", err);
      setErrorMsg(err.message || 'Error cargando datos de configuración de AGUADI ZAP.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch selected conversation messages
  const fetchMessagesForSelected = async (convId: string) => {
    try {
      const headers = { 'x-user-uid': user?.uid || '' };
      const res = await fetch(`/api/aguadi/conversations/${convId}/messages`, { headers });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("[AGUADI ZAP Cabin] Error fetching messages:", error);
    }
  };

  useEffect(() => {
    if (user?.orgId) {
      fetchAguadiData();
    } else if (user) {
      setLoading(false);
      setErrorMsg('Falta orgId en el perfil autenticado. No se usará un fallback de organización.');
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessagesForSelected(selectedConversation.conversationId);
    }
  }, [selectedConversation]);

  // Scroll to end of message history on update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save General settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/aguadi/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Parámetros de AGUADI ZAP guardados de forma exitosa!");
        fetchAguadiData();
      } else {
        alert("Error guardando settings: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Save Widget Config
  const handleSaveWidgetConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!widgetConfig) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/aguadi/widget-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify(widgetConfig)
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Configuración visual del Widget grabada correctamente!");
        fetchAguadiData();
      } else {
        alert("Error guardando widget: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger conversational simulator
  const handleSimulateIncoming = async () => {
    if (!simulatedText.trim() || !simulatedPhone.trim()) return;
    if (!user?.orgId) {
      setErrorMsg('Falta orgId en el perfil autenticado. No se puede simular sin organización real.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/aguadi/simulate-incoming', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({
          phone: simulatedPhone,
          text: simulatedText,
          channel: simulatedChannel,
          orgId: user?.orgId
        })
      });

      const data = await res.json();
      if (data.success) {
        setSimulatedText('');
        // Refresh conversations, messages & leads
        await fetchAguadiData();
        // Select this simulated conversation
        const targetConvId = `${simulatedChannel}_${simulatedPhone.replace(/\D/g, '')}`;
        const found = conversations.find(c => c.conversationId === targetConvId);
        if (found) {
          setSelectedConversation(found);
        } else {
          // Manual construction to force render
          setSelectedConversation({
            conversationId: targetConvId,
            orgId: user?.orgId,
            contactName: data.classification?.fullName || simulatedPhone,
            contactPhone: simulatedPhone,
            channel: simulatedChannel,
            status: data.classification?.isLeadComplete ? 'active' : 'open',
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        alert("Error en el simulador: " + data.error);
      }
    } catch (err: any) {
      alert("Error del servidor: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Create Assignment Rule
  const handleSaveRoutingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/aguadi/routing-rules/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({
          criteriaType: newRuleType,
          criteriaValue: newRuleValue,
          assignedAgentId: newRuleAgent,
          name: newRuleName,
          priority: newRulePriority
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewRuleName('');
        setNewRuleValue('');
        fetchAguadiData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Assignment Rule
  const handleDeleteRoutingRule = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta regla de ruteo?")) return;
    try {
      const res = await fetch('/api/aguadi/routing-rules/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchAguadiData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Create Context Instruction Rule
  const handleSaveTrainingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainKeyword.trim() || !newTrainInstruction.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/aguadi/training-rules/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({
          keywordOrTopic: newTrainKeyword,
          customGuideline: newTrainInstruction
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTrainKeyword('');
        setNewTrainInstruction('');
        fetchAguadiData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Context Instruction Rule
  const handleDeleteTrainingRule = async (id: string) => {
    if (!confirm("¿Eliminar esta directriz de entrenamiento de IA?")) return;
    try {
      const res = await fetch('/api/aguadi/training-rules/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchAguadiData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Create Response Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplTitle.trim() || !newTplText.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/aguadi/response-templates/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({
          title: newTplTitle,
          category: newTplCategory,
          text: newTplText
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTplTitle('');
        setNewTplText('');
        fetchAguadiData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Response Template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla institucional de respuesta?")) return;
    try {
      const res = await fetch('/api/aguadi/response-templates/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchAguadiData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Color picker helper
  const getScoreBadgeColor = (score: number) => {
    if (score >= 75) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/15 border-emerald-100 dark:border-emerald-900/30';
    if (score >= 45) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/15 border-amber-100 dark:border-amber-900/30';
    return 'text-slate-400 bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800/30';
  };

  // Find lead profile associated with selected conversation
  const getSelectedLeadProfile = () => {
    if (!selectedConversation) return null;
    return leads.find(l => l.conversationId === selectedConversation.conversationId) || null;
  };

  const selectedLead = getSelectedLeadProfile();

  if (loading && conversations.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center flex flex-col justify-center items-center dark:bg-slate-900 dark:border-slate-800">
        <RefreshCw className="animate-spin w-8 h-8 text-teal-500 mb-3" />
        <p className="text-sm font-semibold text-slate-500 font-mono">CONECTANDO A LA CENTRAL AGUADI ZAP INMOBILIARIA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="aguadi-cabinet-root">
      
      {/* Header Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-600 dark:bg-teal-500/5">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-950 tracking-tight dark:text-white uppercase leading-none">
                {AGUADI_ZAP_DISPLAY_NAME}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase font-mono border ${
                settings?.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                  : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
              }`}>
                {settings?.status === 'active' ? '● En Línea' : '○ En Pausa'}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Robot calificador integrado con Google Gemini para leads de {settings?.businessName || "Facundo Aguad Bienes Raíces"}.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={fetchAguadiData} 
            className="p-2 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-350 dark:hover:text-white cursor-pointer"
            title="Refrescar Central"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistics Cards (only displayed on non-executive views to maintain crisp layout proportions) */}
      {metricsSummary && activeTab !== 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="aguadi-metrics-grid">
          <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Chats Registrados</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">{metricsSummary.totalConversations || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Leads Capturados</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">{metricsSummary.totalLeads || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Leads Calificados (Completos)</span>
            <p className="text-2xl font-black text-emerald-500 tracking-tight leading-none mt-1">{metricsSummary.qualifiedLeads || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Calificación Promedio (Score)</span>
            <p className="text-2xl font-black text-teal-500 tracking-tight leading-none mt-1">{metricsSummary.averageLeadScore || 0}%</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex overflow-x-auto space-x-1 font-sans">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4.5 py-3 text-xs font-bold tracking-tight rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'dashboard' 
              ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="tab-btn-dashboard"
        >
          <Building2 className="w-4 h-4" />
          <span>Dashboard Principal</span>
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4.5 py-3 text-xs font-bold tracking-tight rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'simulator' 
              ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="tab-btn-simulator"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Simulador & Conversaciones</span>
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4.5 py-3 text-xs font-bold tracking-tight rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'leads' 
              ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Leads en Vivo</span>
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4.5 py-3 text-xs font-bold tracking-tight rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'rules' 
              ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Ruteo & Directrices IA</span>
        </button>
        <button
          onClick={() => setActiveTab('widget')}
          className={`px-4.5 py-3 text-xs font-bold tracking-tight rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'widget' 
              ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Visual Widget & Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4.5 py-3 text-xs font-bold tracking-tight rounded-t-xl transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
            activeTab === 'telemetry' 
              ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Telemetría & Auditoría</span>
        </button>
      </div>

      {/* --- Tab 0: MAIN EXECUTIVE DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in font-sans" id="aguadi-main-dashboard">
          
          {/* Main header block requested by user */}
          <div className="p-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3 max-w-2xl relative z-10">
              <div className="flex items-center space-x-2">
                <span className="bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full font-mono">
                  MÓDULO CENTRAL SaaS
                </span>
                <span className="text-[10px] font-mono text-slate-350 tracking-wider">
                  cloudprop.aguadbienesraices.com.ar
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none uppercase">
                AGUADI ZAP — Conversión WhatsApp 24/7
              </h2>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-light">
                Configurá, probá y optimizá el asistente inteligente que convierte visitantes web en oportunidades comerciales por WhatsApp. Se alimenta de forma segura con modelos avanzados de Google Gemini y flujos de WhatsApp Business Platform.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0 z-10">
              <button
                onClick={() => setActiveTab('simulator')}
                className="px-4.5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-teal-500/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Probar AGUADI ZAP</span>
              </button>
              <button
                onClick={() => setActiveTab('widget')}
                className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Configurar Widget</span>
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span>Ver Conversaciones</span>
              </button>
            </div>
          </div>

          {/* System status cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. AGUADI ZAP Status */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Estado AGUADI ZAP</span>
                <span className="text-xs text-slate-400 mt-1 block">Robot Calificador Central</span>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                <span className="text-sm font-black font-mono tracking-tight uppercase text-slate-800 dark:text-white">
                  {settings?.status === 'active' ? 'online' : settings?.status === 'inactive' ? 'pausado' : 'no_configurado'}
                </span>
              </div>
            </div>

            {/* 2. Gemini status */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Estado Gemini</span>
                <span className="text-xs text-slate-400 mt-1 block">Motor Conversacional IA</span>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.geminiEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-sm font-black font-mono tracking-tight uppercase text-slate-800 dark:text-white">
                  {settings?.geminiEnabled ? 'conectado' : 'no_configurado'}
                </span>
              </div>
            </div>

            {/* 3. WhatsApp API Status */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">WhatsApp API</span>
                <span className="text-xs text-slate-400 mt-1 block">WhatsApp Business Platform</span>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                {/* Genuine visual indicator based on settings flag */}
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.whatsappEnabled ? 'bg-emerald-500' : 'bg-yellow-400'}`} />
                <span className="text-sm font-black font-mono tracking-tight uppercase text-slate-800 dark:text-white">
                  {settings?.whatsappEnabled ? 'conectado' : 'pendiente_configuracion'}
                </span>
              </div>
            </div>

            {/* 4. Widget Web Status */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Widget Web</span>
                <span className="text-xs text-slate-400 mt-1 block">Incrustador de Sitio Web</span>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.widgetEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-sm font-black font-mono tracking-tight uppercase text-slate-800 dark:text-white">
                  {settings?.widgetEnabled ? 'activo' : 'pendiente_instalacion'}
                </span>
              </div>
            </div>

          </div>

          {/* Genuine KPI metrics row (8 cards total) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Conversaciones iniciadas */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Conversaciones iniciadas</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-sans">{conversations.length}</p>
              <span className="text-[8.5px] font-mono text-slate-400">Total acumulado</span>
            </div>

            {/* Card 2: Leads capturados */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Leads capturados</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-sans">{leads.length}</p>
              <span className="text-[8.5px] font-mono text-emerald-500">Enviados a CRM</span>
            </div>

            {/* Card 3: Derivaciones a WhatsApp */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Derivaciones a WhatsApp</span>
              <p className="text-2xl font-black text-teal-500 mt-1 font-sans">
                {conversations.filter(c => c.status === 'routed_to_agent').length}
              </p>
              <span className="text-[8.5px] font-mono text-teal-400">Handoffs activos</span>
            </div>

            {/* Card 4: Conversaciones perdidas */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Conversaciones perdidas</span>
              <p className="text-2xl font-black text-slate-500 mt-1 font-sans">
                {conversations.filter(c => c.status === 'closed').length}
              </p>
              <span className="text-[8.5px] font-mono text-slate-400">Descartados o cerrados</span>
            </div>

            {/* Card 5: Tasa de conversión */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Tasa de conversión</span>
              <p className="text-2xl font-black text-indigo-500 mt-1 font-sans">
                {conversations.length > 0 ? Math.round((leads.length / conversations.length) * 100) : 0}%
              </p>
              <span className="text-[8.5px] font-mono text-slate-400">Conversaciones / Leads</span>
            </div>

            {/* Card 6: Tiempo promedio de respuesta */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Tiempo Promedio Respuesta</span>
              <p className="text-2xl font-black text-slate-400 mt-1 font-sans font-mono">N/A</p>
              <span className="text-[8.5px] font-mono text-slate-400">Esperando tráfico</span>
            </div>

            {/* Card 7: Score promedio de oportunidad */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Score Promedio Oportunidad</span>
              <p className="text-2xl font-black text-emerald-500 mt-1 font-sans">{metricsSummary?.averageLeadScore || 0}%</p>
              <span className="text-[8.5px] font-mono text-emerald-500">Nivel de calificación</span>
            </div>

            {/* Card 8: Última actividad */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Última Actividad</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-3 truncate font-mono">
                {conversations.length > 0 
                  ? new Date(conversations[0].lastMessageAt).toLocaleDateString() + ' ' + new Date(conversations[0].lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  : 'Sin interacción aún'}
              </p>
              <span className="text-[8.5px] font-mono text-slate-400">Aparato de telemetría</span>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side column: Salud, Alertas, Embudo */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Health operative panel */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center space-x-2.5 mb-4">
                  <Activity className="w-5 h-5 text-teal-500" />
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-400">Salud del sistema</h3>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  
                  {/* Item 1. Configuración general */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">Configuración general</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">Establece el nombre comercial del deudor y los tonos del robot.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold font-mono">activo</span>
                      <button onClick={() => setActiveTab('widget')} className="text-teal-600 font-bold hover:underline text-[10px] cursor-pointer">Administrar</button>
                    </div>
                  </div>

                  {/* Item 2. Motor IA Gemini */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">Motor IA Gemini</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">Conector sintético para descodificación de leads con LLM avanzado.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                        settings?.geminiEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {settings?.geminiEnabled ? 'activo' : 'no_configurado'}
                      </span>
                      <button onClick={() => setActiveTab('widget')} className="text-teal-600 font-bold hover:underline text-[10px] cursor-pointer">Verificar</button>
                    </div>
                  </div>

                  {/* Item 3. WhatsApp Cloud API */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">WhatsApp Cloud API</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">Canal directo para chats simultáneos en el número verificado.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                        settings?.whatsappEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {settings?.whatsappEnabled ? 'conectado' : 'pendiente_configuracion'}
                      </span>
                      <button onClick={() => setActiveTab('widget')} className="text-teal-600 font-bold hover:underline text-[10px] cursor-pointer">Configurar</button>
                    </div>
                  </div>

                  {/* Item 4. Widget web público */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">Widget web público</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">Incrustador flotante de script para tu página web corporativa.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                        settings?.widgetEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {settings?.widgetEnabled ? 'instalado' : 'pendiente_instalacion'}
                      </span>
                      <button onClick={() => setActiveTab('widget')} className="text-teal-600 font-bold hover:underline text-[10px] cursor-pointer">Obtener Script</button>
                    </div>
                  </div>

                  {/* Item 5. Reglas de derivación */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">Reglas de derivación</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">Criterios inteligentes de asignación de prospectos a asesores.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                        routingRules.length > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {routingRules.length > 0 ? `${routingRules.length} activas` : 'no_configurado'}
                      </span>
                      <button onClick={() => setActiveTab('rules')} className="text-teal-600 font-bold hover:underline text-[10px] cursor-pointer">Editar</button>
                    </div>
                  </div>

                  {/* Item 6. Entrenamiento IA */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">Entrenamiento IA</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">Pautas y directrices de protección lingüística para el bot.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                        trainingRules.length > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {trainingRules.length > 0 ? `${trainingRules.length} pautas` : 'no_configurado'}
                      </span>
                      <button onClick={() => setActiveTab('rules')} className="text-teal-600 font-bold hover:underline text-[10px] cursor-pointer">Agregar</button>
                    </div>
                  </div>

                  {/* Item 7. Seguridad comercial */}
                  <div className="py-3 flex justify-between items-start gap-4">
                    <div className="text-xs">
                      <strong className="text-slate-850 font-bold dark:text-slate-100">Seguridad comercial</strong>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">La cabina opera bajo controles estrictos de seguridad de datos.</p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold font-mono">activo</span>
                      <span className="text-[10px] font-bold text-slate-400">Protegido</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Conversion funnel */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2.5">
                    <Sliders className="w-5 h-5 text-teal-500" />
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-400">Embudo de conversión comercial</h3>
                  </div>
                  {conversations.length > 0 && (
                    <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Calificación Activa
                    </span>
                  )}
                </div>

                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl border-slate-100">
                    <p className="text-xs font-semibold leading-normal font-mono uppercase tracking-wider">Todavía no hay actividad suficiente para calcular el embudo de conversión.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-2">
                    
                    {/* Stage 1: Visitantes Atendidos */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>1. Visitantes Atendidos (Chats)</span>
                        <span className="font-mono">{conversations.length}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 dark:bg-slate-800 overflow-hidden">
                        <div className="bg-slate-400 h-3.5 rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>

                    {/* Stage 2: Conversaciones calificadas */}
                    <div className="space-y-1">
                      {(() => {
                        const count = conversations.filter(c => c.status === 'active' || c.status === 'routed_to_agent').length;
                        const pct = conversations.length > 0 ? Math.round((count / conversations.length) * 100) : 0;
                        return (
                          <>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>2. Conversaciones Calificadas</span>
                              <span className="font-mono">{count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3.5 dark:bg-slate-800 overflow-hidden">
                              <div className="bg-indigo-400 h-3.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Stage 3: Leads creados */}
                    <div className="space-y-1">
                      {(() => {
                        const count = leads.length;
                        const pct = conversations.length > 0 ? Math.round((count / conversations.length) * 100) : 0;
                        return (
                          <>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>3. Leads Creados (Base CRM)</span>
                              <span className="font-mono">{count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3.5 dark:bg-slate-800 overflow-hidden">
                              <div className="bg-teal-400 h-3.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Stage 4: Derivaciones a WhatsApp */}
                    <div className="space-y-1">
                      {(() => {
                        const count = conversations.filter(c => c.status === 'routed_to_agent').length;
                        const pct = conversations.length > 0 ? Math.round((count / conversations.length) * 100) : 0;
                        return (
                          <>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>4. Derivaciones a WhatsApp (Handoff)</span>
                              <span className="font-mono">{count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3.5 dark:bg-slate-800 overflow-hidden">
                              <div className="bg-emerald-400 h-3.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Stage 5: Oportunidades activas */}
                    <div className="space-y-1">
                      {(() => {
                        const count = leads.filter(l => l.status === 'calificado').length;
                        const pct = conversations.length > 0 ? Math.round((count / conversations.length) * 100) : 0;
                        return (
                          <>
                            <div className="flex justify-between text-xs font-semibold">
                              <span>5. Oportunidades Activas (Score &gt;= 70%)</span>
                              <span className="font-mono">{count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3.5 dark:bg-slate-800 overflow-hidden">
                              <div className="bg-emerald-500 h-3.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                  </div>
                )}
              </div>

              {/* Recent Conversations table */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2.5">
                    <MessageSquare className="w-5 h-5 text-teal-500" />
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-400">Conversaciones recientes</h3>
                  </div>
                </div>

                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl border-slate-100">
                    <p className="text-xs font-semibold font-mono text-slate-400 uppercase tracking-wider">
                      Todavía no hay conversaciones registradas. Cuando AGUADI ZAP comience a operar, aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase font-mono tracking-wider bg-slate-50/50 dark:bg-slate-850">
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Canal</th>
                          <th className="p-2.5">Intención / Operación</th>
                          <th className="p-2.5">Estado</th>
                          <th className="p-2.5">Score</th>
                          <th className="p-2.5">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversations.slice(0, 5).map((conv) => {
                          const associatedLead = leads.find(l => l.conversationId === conv.conversationId);
                          return (
                            <tr key={conv.conversationId} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800">
                              <td className="p-2.5 font-mono text-[10px] text-slate-400">
                                {new Date(conv.lastMessageAt).toLocaleDateString()}
                              </td>
                              <td className="p-2.5">
                                <strong className="font-bold text-slate-900 dark:text-white block truncate max-w-[120px]">{conv.contactName}</strong>
                                <span className="text-[10px] text-slate-400 font-mono block">{conv.contactPhone}</span>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                                  conv.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {conv.channel}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 text-[9px] font-bold uppercase tracking-tight font-sans">
                                  {associatedLead?.operationType || 'Consulta'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-semibold bg-indigo-50 text-indigo-600 uppercase">
                                  {conv.status}
                                </span>
                              </td>
                              <td className="p-2.5 font-black font-mono text-[11px] text-slate-850 dark:text-slate-100">
                                {associatedLead?.score || 0}%
                              </td>
                              <td className="p-2.5">
                                <button
                                  onClick={() => {
                                    setSelectedConversation(conv);
                                    setActiveTab('simulator');
                                  }}
                                  className="text-[10.5px] text-teal-600 font-bold hover:underline cursor-pointer"
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Right side column: Recomended Actions, Widget Card, Training, Routing Summary */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Recommended Actions */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-3">
                <strong className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase block">Próximas acciones recomendadas</strong>
                
                <div className="space-y-2.5 text-xs font-sans">
                  
                  {/* Action 1 */}
                  <div className="p-3 bg-teal-500/5 border border-teal-100/30 rounded-2xl relative">
                    <p className="font-bold text-slate-900 dark:text-white text-[11px]">Configurar Gemini API desde backend seguro</p>
                    <p className="text-slate-500 text-[10px] mt-1">Nativa e inyectada por el Panel de Google Cloud / Settings en .env sin exponerla en el frontend.</p>
                  </div>

                  {/* Action 2: WhatsApp */}
                  {!settings?.whatsappEnabled && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl relative">
                      <p className="font-bold text-slate-800 dark:text-amber-300 text-[11px]">Configurar WhatsApp Cloud API</p>
                      <p className="text-slate-500 text-[10px] mt-1">Conecta el webhook oficial para que AGUADI ZAP interactúe directamente desde tu línea verificada de WhatsApp Business.</p>
                    </div>
                  )}

                  {/* Action 3: Routing rules */}
                  {routingRules.length === 0 && (
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl relative">
                      <p className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">Crear regla de derivación a agentes</p>
                      <p className="text-slate-500 text-[10px] mt-1">Asigna de forma programada los leads de compra a Facundo y alquileres a Marcos Vargas.</p>
                    </div>
                  )}

                  {/* Action 4: Widget allowed domains */}
                  <div className="p-3 bg-slate-50 border border-slate-250/30 rounded-2xl relative dark:bg-slate-850 dark:border-slate-800">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Completar entrenamiento y directivas de la IA</p>
                    <p className="text-slate-500 text-[10px] mt-1">Inyecta pautas estrictas en la pestaña Ruteo y Directrices para que el bot responda con cautela profesional.</p>
                  </div>

                </div>
              </div>

              {/* Widget web Script detail card */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-teal-500 animate-pulse" />
                  <strong className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase block">Widget web AGUADI ZAP</strong>
                </div>

                <div className="text-xs space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2 rounded-xl dark:bg-slate-850 font-mono text-[9.5px]">
                    <div>
                      <span className="text-slate-400 block uppercase">Dominio</span>
                      <strong className="text-slate-800 dark:text-slate-100 truncate block">cloudprop.aguadbienesraices.com.ar</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase">Avatar</span>
                      <strong className="text-slate-800 dark:text-slate-100 truncate block">Personalizado</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono">Nombre</span>
                      <strong className="text-slate-800 dark:text-slate-100 truncate block">{widgetConfig?.visibleName || AGUADI_ZAP_MODULE_NAME}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-mono">Posición</span>
                      <strong className="text-slate-800 dark:text-slate-100 truncate block">{widgetConfig?.position || 'derecha'}</strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-1">Código de instalación previsto:</span>
                    <div className="bg-slate-950 text-emerald-400 p-3 rounded-2xl text-[9.5px] font-mono leading-relaxed border border-slate-900 select-all overflow-x-auto">
                      {`<!-- AGUADI ZAP 24/7 web conversion script -->
<script src="https://cloudprop.aguadbienesraices.com.ar/widget/aguadi-zap.js"></script>`}
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-1.5 italic">
                      Insertar este script después de la etiqueta <code>&lt;header&gt;</code> del sitio web.
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulator Preview block */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-3.5">
                <strong className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase block">Simulador AGUADI ZAP</strong>
                <p className="text-slate-400 text-[10px] font-medium leading-relaxed">
                  Prueba el comportamiento sintético del bot para ver cómo califica y rutea leads en vivo según distintos escenarios:
                </p>

                <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                  <button
                    onClick={() => {
                      setSimulatedPhone('+5493815011111');
                      setSimulatedText('Hola, me llamo Fernando Ortiz, busco una casa grande de 4 dormitorios para comprar en Lomas de Tafí con cochera triple. Presupuesto aproximado USD 120,000.');
                      setActiveTab('simulator');
                    }}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-semibold hover:border-teal-500 transition cursor-pointer text-left truncate dark:bg-slate-850 dark:border-slate-800"
                  >
                    🏠 Comprador Interesado
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedPhone('+5493816222222');
                      setSimulatedText('Urgente! busco alquilar departamento chico de 1 ambiente cerca de la facultad de medicina en Tucumán centro. Tengo para pagar hasta $120.000.');
                      setActiveTab('simulator');
                    }}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-semibold hover:border-teal-500 transition cursor-pointer text-left truncate dark:bg-slate-850 dark:border-slate-800"
                  >
                    ⚡ Inquilino Urgente
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedPhone('+5493817333333');
                      setSimulatedText('Buenas tardes, mi nombre es Estela Juárez y tengo un duplex de 3 dormitorios en Yerba Buena que quisiera poner a la venta.');
                      setActiveTab('simulator');
                    }}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-semibold hover:border-teal-500 transition cursor-pointer text-left truncate dark:bg-slate-850 dark:border-slate-800"
                  >
                    💼 Propietario Vendedor
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedPhone('+5493818444444');
                      setSimulatedText('Hola, busco dar en alquiler mi local comercial en peatonal Muñecas. Tiene 100 metros cuadrados.');
                      setActiveTab('simulator');
                    }}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-semibold hover:border-teal-500 transition cursor-pointer text-left truncate dark:bg-slate-850 dark:border-slate-800"
                  >
                    🔑 Propietario Locador
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedPhone('+5493819555555');
                      setSimulatedText('Hola, soy inversor de Tucumán y busco lotes rústicos en cantidad para desarrollar un barrio privado cerrado. Presupuesto disponible USD 350.000.');
                      setActiveTab('simulator');
                    }}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-semibold hover:border-teal-500 transition cursor-pointer text-left truncate dark:bg-slate-850 dark:border-slate-800"
                  >
                    📈 Inversor
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedPhone('+5493811666666');
                      setSimulatedText('¿En qué zonas de cobertura atienden y cuáles son sus horarios de oficina?');
                      setActiveTab('simulator');
                    }}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl font-semibold hover:border-teal-500 transition cursor-pointer text-left truncate dark:bg-slate-850 dark:border-slate-800"
                  >
                    ❓ Consulta General
                  </button>
                </div>

                <p className="bg-amber-500/5 text-amber-600 border border-amber-500/15 p-2 rounded-2xl text-[9.5px] leading-relaxed font-sans">
                  ⚠️ <strong>Aviso:</strong> El simulador se comunicará con Gemini cuando el backend seguro de Cloud y las variables de entornos queden completamente enlazadas.
                </p>
              </div>

              {/* Training Summary box */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-3.5 animate-fade-in">
                <strong className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase block font-mono">Reglas de entrenamiento IA</strong>
                
                <div className="text-xs space-y-1.5 text-slate-600 leading-normal font-sans">
                  <div className="flex items-start space-x-1.5">
                    <span className="text-teal-500 font-bold shrink-0">✓</span>
                    <span>No inventar propiedades inexistentes.</span>
                  </div>
                  <div className="flex items-start space-x-1.5">
                    <span className="text-teal-500 font-bold shrink-0">✓</span>
                    <span>No confirmar disponibilidad sin validación previa.</span>
                  </div>
                  <div className="flex items-start space-x-1.5">
                    <span className="text-teal-500 font-bold shrink-0">✓</span>
                    <span>No tasar inmuebles en línea de forma sintética.</span>
                  </div>
                  <div className="flex items-start space-x-1.5">
                    <span className="text-teal-500 font-bold shrink-0">✓</span>
                    <span>No ofrecer precios estimados de forma deudora.</span>
                  </div>
                  <div className="flex items-start space-x-1.5">
                    <span className="text-teal-500 font-bold shrink-0">✓</span>
                    <span>No cerrar operaciones sin agentes humanos.</span>
                  </div>
                </div>
              </div>

              {/* Routing Summary */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-3">
                <strong className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase block font-mono">Derivación inteligente</strong>
                <div className="text-xs bg-slate-50/50 p-2.5 rounded-2xl dark:bg-slate-850 leading-relaxed text-slate-500 space-y-1 font-sans">
                  <p><strong>Criterios dinámicos de ruteo:</strong> {routingRules.length} reglas activas</p>
                  <p className="mt-1">Reglas del contrato:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Si la intención es <strong>compra</strong>, derivar a agente Facundo.</li>
                    <li>Si la intención es <strong>alquiler</strong>, derivar a Marcos Vargas.</li>
                    <li>Si la intención es de <strong>propietario vendedor</strong>, asignar a agente Senior.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* --- Tab 1: SIMULATOR & LIVE CHATS --- */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="simulator-tab-stage">
          
          {/* Box 1: Conversation Logs Selector (Left Rail 3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 p-4 shrink-0 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase mb-3 block">Conversaciones Activas</h2>
            <div className="space-y-1.5 overflow-y-auto max-h-[500px]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl dark:border-slate-800">
                  Ninguna conversación registrada aún. Dispara un saludo abajo.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedConversation?.conversationId === conv.conversationId;
                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all text-xs cursor-pointer block ${
                        isSelected 
                          ? 'bg-teal-500/5 border-teal-200 shadow-xs' 
                          : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 dark:bg-slate-800/20 dark:border-slate-800/30'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <strong className="font-bold text-slate-900 dark:text-slate-100 truncate block max-w-[120px]">{conv.contactName}</strong>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                          conv.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/10'
                        }`}>
                          {conv.channel}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1 font-mono text-[9px] truncate">{conv.contactPhone}</p>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold tracking-tight uppercase ${
                          conv.status === 'active' || conv.status === 'routed_to_agent' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {conv.status}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Box 2: Central Active Conversation Chat Box (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800 min-h-[550px]">
            
            {/* Active dialogue header */}
            <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex justify-between items-center dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 font-bold text-xs select-none dark:bg-slate-850">
                  {selectedConversation?.contactName.charAt(0).toUpperCase() || "C"}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{selectedConversation?.contactName || "Canal de Prueba"}</h3>
                  <span className="text-[9px] text-slate-400 font-mono block -mt-0.5">{selectedConversation?.contactPhone || "Consola local abierta"}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-mono font-bold dark:bg-slate-800 dark:text-slate-350">
                Historial de Eventos
              </span>
            </div>

            {/* Scrolling chat bubble body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[360px] min-h-[300px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center text-slate-400 p-6">
                  <Bot className="w-8 h-8 text-teal-500 opacity-20 mb-2 animate-bounce" />
                  <p className="text-xs font-semibold leading-normal font-mono uppercase tracking-wide">Inicia la simulación del prospecto abajo</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">{`Simule un mensaje para forzar la interacción en la base temporal con Inteligencia de Gemini y calificar leads.`}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3 text-xs border ${
                        isBot 
                          ? 'bg-slate-50 border-slate-100 text-slate-800 rounded-tl-none dark:bg-slate-800 dark:border-slate-800 dark:text-slate-200' 
                          : 'bg-teal-500/5 border-teal-200 text-teal-900 rounded-tr-none dark:text-teal-100'
                      }`}>
                        <div className="flex items-center space-x-1.5 mb-1 text-[9px] font-bold tracking-widest text-slate-400 font-mono uppercase">
                          <span>{isBot ? 'AGUADI_ZAP_BOT' : 'CLIENTE / INTERESADO'}</span>
                          {isBot && msg.metadata?.leadScore !== undefined && (
                            <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-1 rounded-sm">Score: {msg.metadata.leadScore}%</span>
                          )}
                        </div>
                        <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                        <span className="text-[8px] text-slate-400 font-mono block mt-1.5 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Conversation text simulator controls */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-3 dark:bg-slate-900 dark:border-slate-800">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Simulador Teléfono</label>
                  <input 
                    type="text" 
                    value={simulatedPhone}
                    onChange={(e) => setSimulatedPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Canal de simulación</label>
                  <select
                    value={simulatedChannel}
                    onChange={(e: any) => setSimulatedChannel(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="whatsapp">WhatsApp Cloud API</option>
                    <option value="widget">Widget Web Público</option>
                  </select>
                </div>
                <div className="col-span-2 lg:col-span-1 flex items-end">
                  <button
                    onClick={() => {
                      setSimulatedPhone('+549381' + Math.floor(1000000 + Math.random() * 9000000));
                      setSimulatedText('Hola, me llamo Juan Herrera, quiero alquilar un departamento o casa de 2 dormitorios en Barrio Norte (Tucumán) por cerca de $350.000 pesos de presupuesto.');
                    }}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold tracking-tight font-mono transition uppercase cursor-pointer dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700"
                  >
                    🎲 Cargar Aleatorio
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Texto del mensaje a simular</label>
                <div className="relative mt-1">
                  <textarea
                    rows={2}
                    value={simulatedText}
                    onChange={(e) => setSimulatedText(e.target.value)}
                    placeholder="Escriba aquí la frase coloquial del cliente interesado..."
                    className="w-full pl-3 pr-12 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={handleSimulateIncoming}
                    disabled={submitting || !simulatedText.trim()}
                    className="absolute right-2 bottom-3 p-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:opacity-95 shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-40 transition-opacity"
                    title="Simular Envío"
                  >
                    {submitting ? (
                      <RefreshCw className="animate-spin w-4.5 h-4.5" />
                    ) : (
                      <Send className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: AI Qualification Summary Matrix Right Card (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Qualification Panel Card */}
            <div className="bg-white rounded-3xl border border-slate-100 p-4.5 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-4">
              <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase block">Análisis de Lead en Vivo</h2>
              
              {/* Score Meter Ring */}
              <div className="flex flex-col items-center py-2 text-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {/* Gauge Ring Visual wrapper */}
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                    <circle cx="56" cy="56" r="48" 
                      className={
                        (selectedLead?.score || 0) >= 70 ? 'stroke-emerald-500' : (selectedLead?.score || 0) >= 40 ? 'stroke-amber-500' : 'stroke-rose-400'
                      } 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - (selectedLead?.score || 10) / 100)}
                    />
                  </svg>
                  <div className="text-center font-sans">
                    <span className="text-2xl font-black text-slate-950 dark:text-white">{selectedLead?.score || 0}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono -mt-1">SCORE</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider mt-3 uppercase border ${getScoreBadgeColor(selectedLead?.score || 0)}`}>
                  {(selectedLead?.score || 0) >= 70 ? '🟢 Lead Calificado' : (selectedLead?.score || 0) >= 40 ? '🟡 En Captura' : '🔴 Frío / Incompleto'}
                </span>
              </div>

              {/* Lead Extracted Schema Attributes */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl dark:bg-slate-800/10">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Cliente</span>
                  <strong className="text-slate-900 dark:text-white font-bold truncate max-w-[120px]">{selectedLead?.fullName || 'Pendiente'}</strong>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl dark:bg-slate-800/10">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Operación</span>
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 font-bold uppercase text-[9px] tracking-tight">
                    {selectedLead?.operationType || 'No detectada'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl dark:bg-slate-800/10">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Inmueble</span>
                  <span className="text-slate-900 dark:text-white font-semibold truncate uppercase text-[10px] tracking-tight">
                    {selectedLead?.propertyType || 'Sin declarar'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl dark:bg-slate-800/10">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Zona preferida</span>
                  <strong className="text-slate-900 dark:text-white font-bold truncate max-w-[120px]">{selectedLead?.zone || 'Indefinida'}</strong>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl dark:bg-slate-800/10">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Presupuesto</span>
                  <strong className="text-emerald-600 font-bold truncate max-w-[120px] font-mono">{selectedLead?.budgetRange || 'No declarado'}</strong>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl dark:bg-slate-800/10">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">Agente Asignado</span>
                  <span className="text-slate-600 text-[10px] font-semibold flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-teal-500" />
                    <span className="truncate max-w-[100px]">{selectedLead?.assignedAgentId || 'Buscando...'}</span>
                  </span>
                </div>
              </div>

              {/* Summaries Text */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[9px] font-black font-mono tracking-widest text-slate-400 uppercase block mb-1">Resumen IA (AI Briefing)</span>
                <p className="text-slate-500/90 leading-relaxed text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800/50 max-h-[100px] overflow-y-auto">
                  {selectedLead?.aiSummary || 'Deduciendo contexto de la conversación... El bot interactivo intentará estructurar un informe en este espacio.'}
                </p>
              </div>

              {/* Next best action recommendation */}
              <div className="pt-1 text-xs">
                <span className="text-[9px] font-black font-mono tracking-widest text-slate-400 uppercase block mb-1">Acción Intelectiva Recomendada</span>
                <p className="text-teal-600 leading-normal text-[11px] font-bold bg-teal-500/5 p-2 rounded-xl border border-teal-100/30 flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{selectedLead?.nextBestAction || 'Interpolar variables para predecir la mejor tarea comercial.'}</span>
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* --- Tab 2: CAPTURED LEADS LIST --- */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 font-sans" id="leads-list-stage">
          <div className="flex justify-between items-center mb-4.5">
            <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase">Leads calificados por AGUADI ZAP en Firestore</h2>
            <span className="text-xs text-slate-400 font-mono">Registros totales en el cuadrante: <strong>{leads.length}</strong></span>
          </div>

          {leads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-100 rounded-3xl dark:border-slate-800">
              <Bot className="w-12 h-12 text-slate-300 mx-auto opacity-40 mb-3" />
              <p className="text-sm font-semibold uppercase tracking-wider font-mono">No hay leads capturados en esta ventana bilingüe</p>
              <p className="text-xs text-slate-400 mt-2">Visita el simulador para ingresar interacciones piloto que Gemini clasificará de forma analítica en Firestore.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-full">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-mono tracking-wider bg-slate-50/50 dark:bg-slate-850 dark:border-slate-800">
                    <th className="p-3">Nombre Lead / Teléfono</th>
                    <th className="p-3">Operación / Inmueble</th>
                    <th className="p-3">Zona preferida</th>
                    <th className="p-3">Calificación (Score)</th>
                    <th className="p-3">Presupuesto</th>
                    <th className="p-3">Canal</th>
                    <th className="p-3">Agente asignado</th>
                    <th className="p-3">Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.leadId} className="border-b border-slate-100 hover:bg-slate-50/50 transition dark:border-slate-800/40">
                      <td className="p-3">
                        <strong className="font-bold text-slate-900 dark:text-slate-100 block">{lead.fullName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono block">{lead.phone}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 font-bold uppercase text-[9px] tracking-tight block w-fit mb-1">
                          {lead.operationType || 'Otro'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase block tracking-tight">
                          {lead.propertyType || 'Sin especificar'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold uppercase tracking-tight">{lead.zone || 'No declarada'}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 dark:bg-slate-800">
                            <div className={`h-1.5 rounded-full ${
                              (lead.score || 0) >= 70 ? 'bg-emerald-500' : (lead.score || 0) >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                            }`} style={{ width: `${lead.score}%` }}></div>
                          </div>
                          <span className="font-black font-mono">{lead.score || 0}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/10 px-2 py-0.5 rounded-lg border border-emerald-100/30">
                          {lead.budgetRange || '---'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="p-1 px-1.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                          <UserCheck className="w-4 h-4 text-teal-500" />
                          <span className="tracking-tight">{lead.assignedAgentId || 'Pendiente'}</span>
                        </div>
                      </td>
                      <td className="p-3 max-w-[205px]">
                        <p className="text-[11px] text-slate-400 truncate mt-0.5" title={lead.aiSummary}>
                          {lead.aiSummary}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- Tab 3: ROUTING & TRAINING RULES --- */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="rules-tab-stage font-sans">
          
          {/* Rules Left Column: Assignment rules CRUD (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase">Motor de Asignación y Ruteo de Leads</h2>
            <p className="text-slate-400 text-xs font-medium leading-normal">
              Reglas lógicas dinámicas aplicadas al instante de calificar un lead. Si cumple los criterios, se deriva al agente respectivo.
            </p>

            {/* Rule form */}
            <form onSubmit={handleSaveRoutingRule} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800 space-y-3.5">
              <strong className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Crear Nueva Regla de Ruteo</strong>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Nombre Descriptivo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Terrenos Yerba Buena"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-8次 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Agente Destinatario</label>
                  <select
                    value={newRuleAgent}
                    onChange={(e) => setNewRuleAgent(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800"
                  >
                    <option value="agent-default">Clasificación Tradicional (Default)</option>
                    <option value="agent-facundo">Facundo Aguad (Alta Gama)</option>
                    <option value="agent-vargas">Marcos Vargas (Alquileres)</option>
                    <option value="agent-terrenos">Dpto Lotes (Terrenos)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Criterio Variable</label>
                  <select
                    value={newRuleType}
                    onChange={(e: any) => setNewRuleType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800"
                  >
                    <option value="operationType">Tipo Operación (compra, venta...)</option>
                    <option value="propertyType">Tipo Inmueble (casa, departamento...)</option>
                    <option value="zone">Zona Geográfica (Yerba Buena, Barrio Norte...)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Criterio Valor EXACTO / Contiene</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Yerba Buena, compra, casa"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Prioridad:</label>
                  <input 
                    type="number" 
                    value={newRulePriority} 
                    onChange={(e) => setNewRulePriority(Number(e.target.value))}
                    className="w-12 px-2 py-0.5 border border-slate-200 rounded text-center font-mono focus:outline-none dark:border-slate-800 dark:bg-slate-800" 
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold tracking-tight transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Agregar Regla
                </button>
              </div>
            </form>

            {/* Rules list */}
            <div className="space-y-2">
              {routingRules.length === 0 ? (
                <p className="p-4 text-center text-xs border border-dashed border-slate-100 rounded-xl text-slate-400">Sin reglas manuales creadas.</p>
              ) : (
                routingRules.map((rule) => (
                  <div key={rule.ruleId} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
                    <div className="text-xs">
                      <div className="flex items-center space-x-1.5">
                        <strong className="font-bold text-slate-900 dark:text-slate-100">{rule.name}</strong>
                        <span className="text-[9px] bg-slate-100 px-1 border border-slate-200 rounded font-mono text-slate-400">Prioridad: {rule.priority}</span>
                      </div>
                      <p className="text-slate-400 mt-0.5 text-[11px]">
                        Si <b className="text-teal-600 font-bold">{rule.criteriaType}</b> es <strong className="text-slate-800 uppercase text-[9px] font-black">{rule.criteriaValue}</strong> enviar a Agente <b className="text-indigo-600 font-bold">{rule.assignedAgentId}</b>.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteRoutingRule(rule.ruleId)}
                      className="p-1 px-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rules Right Column: Context Guidelines & Templates (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Context Guidelines box */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-4">
              <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase">Directrices de Entrenamiento de IA (Context Injection)</h2>
              <p className="text-slate-400 text-xs font-medium leading-normal">
                Regula e inyecta respuestas institucionales que Gemini adoptará si el cliente menciona temas específicos (ej: tarifas, turnos, comisiones).
              </p>

              {/* Training Rule form */}
              <form onSubmit={handleSaveTrainingRule} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800 space-y-3.5">
                <strong className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Inyectar Pauta Lingüística</strong>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Palabra clave o Tema detonante</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: comisiones, honorarios"
                      value={newTrainKeyword}
                      onChange={(e) => setNewTrainKeyword(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Instrucción de Respuesta (Directiva para el robot)</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ej: Explicar cordialmente que cobramos el 3% de honorarios de venta y ofrece agendar tasación."
                      value={newTrainInstruction}
                      onChange={(e) => setNewTrainInstruction(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-800"
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold tracking-tight transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Agregar Directiva
                    </button>
                  </div>
                </div>
              </form>

              {/* Training Rules list */}
              <div className="space-y-2">
                {trainingRules.length === 0 ? (
                  <p className="p-4 text-center text-xs border border-dashed border-slate-100 rounded-xl text-slate-400">Sin directrices específicas. AGUADI ZAP responde libremente bajo ética profesional.</p>
                ) : (
                  trainingRules.map((r) => (
                    <div key={r.ruleId} className="flex justify-between items-start p-3 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
                      <div className="text-xs">
                        <strong className="text-slate-900 block dark:text-slate-100">Filtro: "{r.keywordOrTopic}"</strong>
                        <p className="text-slate-500 mt-1 leading-normal text-[11px]">"{r.customGuideline}"</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteTrainingRule(r.ruleId)}
                        className="p-1 px-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 rounded-lg transition shrink-0 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Response Templates Box */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-4">
              <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase">Plantillas Oficiales de Respuesta (Institutional Material)</h2>
              <p className="text-slate-400 text-xs font-medium leading-normal">
                Define bloques oficiales y párrafos comerciales redactados de la inmobiliaria. Gemini utilizará estos para complementar las respuestas.
              </p>

              {/* Template form */}
              <form onSubmit={handleSaveTemplate} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800 space-y-3.5">
                <strong className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Añadir Plantilla Comercial</strong>
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Título de Plantilla</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Bienvenida Institucional"
                        value={newTplTitle}
                        onChange={(e) => setNewTplTitle(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Categoría</label>
                      <input
                        type="text"
                        required
                        placeholder="General, Saludo, Tasaciones"
                        value={newTplCategory}
                        onChange={(e) => setNewTplCategory(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Cuerpo del Texto Comercial</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Redacte aquí el texto oficial que se le enviará..."
                      value={newTplText}
                      onChange={(e) => setNewTplText(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl"
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold tracking-tight transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Agregar Plantilla
                    </button>
                  </div>
                </div>
              </form>

              {/* Templates list */}
              <div className="space-y-2">
                {responseTemplates.length === 0 ? (
                  <p className="p-4 text-center text-xs border border-dashed border-slate-100 rounded-xl text-slate-400">Sin plantillas precargadas.</p>
                ) : (
                  responseTemplates.map((tpl) => (
                    <div key={tpl.templateId} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
                      <div className="flex justify-between items-start">
                        <div className="text-xs">
                          <strong className="text-slate-900 font-bold dark:text-slate-100">{tpl.title}</strong>
                          <span className="px-1.5 py-0.2 bg-teal-500/10 text-teal-600 font-bold text-[8px] uppercase tracking-tight rounded-full ml-1">{tpl.category}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteTemplate(tpl.templateId)}
                          className="p-1 text-rose-500 hover:text-rose-700 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-400 mt-2 text-[10.5px] italic">"{tpl.text}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- Tab 4: VISUAL WIDGET & SETTINGS --- */}
      {activeTab === 'widget' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="widget-tab-stage font-sans">
          
          {/* Settings Left Column (6 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* General AGUADI ZAP parameters form */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase mb-4 block">Parámetros Operacionales del Robot</h2>
              
              {settings && (
                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Nombre Comercial del Asistente</label>
                      <input 
                        type="text" 
                        required
                        value={settings.assistantName}
                        onChange={(e) => setSettings({ ...settings, assistantName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Nombre de la Inmobiliaria</label>
                      <input 
                        type="text" 
                        required
                        value={settings.businessName}
                        onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Tono Conversacional</label>
                      <select
                        value={settings.tone}
                        onChange={(e: any) => setSettings({ ...settings, tone: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl"
                      >
                        <option value="warm">Cálido y empático (Recomendado)</option>
                        <option value="professional">Profesional y asertivo</option>
                        <option value="formal">Formal y corporativo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Agente Asignado por Defecto</label>
                      <select
                        value={settings.defaultAgentId}
                        onChange={(e) => setSettings({ ...settings, defaultAgentId: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl"
                      >
                        <option value="agent-default">Clasificación Tradicional (Default)</option>
                        <option value="agent-facundo">Facundo Aguad (Alta Gama)</option>
                        <option value="agent-vargas">Marcos Vargas (Alquileres)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <strong className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Canales y Activaciones</strong>
                    
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.status === 'active'}
                          onChange={(e) => setSettings({ ...settings, status: e.target.checked ? 'active' : 'inactive' })}
                          className="w-4 h-4 text-teal-600 focus:ring-0"
                        />
                        <div>
                          <strong className="text-[11px] block text-slate-700">Robot Generativo ACTIVO</strong>
                          <span className="text-[9px] text-slate-400 block -mt-0.5">Permite procesar respuestas automáticas por IA.</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.whatsappEnabled}
                          onChange={(e) => setSettings({ ...settings, whatsappEnabled: e.target.checked })}
                          className="w-4 h-4 text-teal-600 focus:ring-0"
                        />
                        <div>
                          <strong className="text-[11px] block text-slate-700">Integración con WhatsApp</strong>
                          <span className="text-[9px] text-slate-400 block -mt-0.5">Permite conectar con WhatsApp Cloud API webhook.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="text-right pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md shadow-teal-500/10 cursor-pointer"
                    >
                      Grabar Parámetros Operacionales
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Embeddable chat widget styling config */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase mb-4 block">Estilos Visuales del Widget Público</h2>
              
              {widgetConfig && (
                <form onSubmit={handleSaveWidgetConfig} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Título del Encabezado</label>
                      <input 
                        type="text" 
                        required
                        value={widgetConfig.visibleName}
                        onChange={(e) => setWidgetConfig({ ...widgetConfig, visibleName: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Texto del botón flotante</label>
                      <input 
                        type="text" 
                        required
                        value={widgetConfig.buttonText}
                        onChange={(e) => setWidgetConfig({ ...widgetConfig, buttonText: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Color Principal (Hex)</label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="color" 
                          value={widgetConfig.primaryColor}
                          onChange={(e) => setWidgetConfig({ ...widgetConfig, primaryColor: e.target.value })}
                          className="w-8 h-8 rounded border p-0 cursor-pointer shrink-0"
                        />
                        <input 
                          type="text" 
                          value={widgetConfig.primaryColor}
                          onChange={(e) => setWidgetConfig({ ...widgetConfig, primaryColor: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-center font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Color Secundario (Hex)</label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="color" 
                          value={widgetConfig.secondaryColor}
                          onChange={(e) => setWidgetConfig({ ...widgetConfig, secondaryColor: e.target.value })}
                          className="w-8 h-8 rounded border p-0 cursor-pointer shrink-0"
                        />
                        <input 
                          type="text" 
                          value={widgetConfig.secondaryColor}
                          onChange={(e) => setWidgetConfig({ ...widgetConfig, secondaryColor: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-center font-mono"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Mensaje de bienvenida inicial (First dialogue bubble)</label>
                      <textarea
                        rows={2}
                        required
                        value={widgetConfig.initialMessage}
                        onChange={(e) => setWidgetConfig({ ...widgetConfig, initialMessage: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">URL Avatar (AI Icon)</label>
                      <input 
                        type="text" 
                        required
                        value={widgetConfig.botAvatarUrl}
                        onChange={(e) => setWidgetConfig({ ...widgetConfig, botAvatarUrl: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="text-right pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md shadow-teal-500/10 cursor-pointer"
                    >
                      Grabar Configuración de Widget
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>

          {/* Graphical Mockup Column (5 cols, right side) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start sticky top-6">
            <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase mb-4 block">Vista Previa del Widget en Tiempo Real</h2>
            
            {widgetConfig && (
              <div className="relative w-full max-w-xs aspect-[9/16] bg-slate-150 rounded-[40px] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between dark:bg-slate-900 bg-opacity-40">
                {/* Simulated Notch */}
                <div className="absolute top-0 inset-x-0 h-4.5 bg-slate-800 flex justify-center items-center rounded-b-xl z-20">
                  <div className="w-12 h-3.5 bg-black rounded-full mb-1"></div>
                </div>

                {/* Simulated Content page */}
                <div className="flex-1 bg-yellow-50/10 flex flex-col justify-end p-4 relative font-sans">
                  
                  {/* Floating Action Button simulation */}
                  <div className="absolute bottom-16 right-4 flex flex-col items-end space-y-2 z-10">
                    
                    {/* Floating chat box representation */}
                    {widgetPreviewOpen && (
                      <div className="bg-white w-64 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col justify-between" style={{ fontFamily: 'sans-serif' }}>
                        {/* Box Header stylized dynamically */}
                        <div className="p-3 text-white flex items-center justify-between" style={{ backgroundColor: widgetConfig.primaryColor }}>
                          <div className="flex items-center space-x-2">
                            <img src={widgetConfig.botAvatarUrl} className="w-6.5 h-6.5 rounded-full border border-white/20 shadow" />
                            <div>
                              <h4 className="text-[10px] font-bold leading-none">{widgetConfig.visibleName}</h4>
                              <span className="text-[7.5px] text-teal-300 block font-mono font-bold uppercase mt-0.5 animate-pulse">● En Línea 24/7</span>
                            </div>
                          </div>
                          <button onClick={() => setWidgetPreviewOpen(false)} className="text-white hover:opacity-75">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dialogue preview */}
                        <div className="p-3 max-h-40 overflow-y-auto space-y-2 text-[10px]">
                          <div className="bg-slate-50 border border-slate-100 text-slate-700 p-2.5 rounded-2xl rounded-tl-none">
                            {widgetConfig.initialMessage}
                          </div>
                        </div>

                        {/* Quick tags */}
                        <div className="px-3 pb-2 flex flex-wrap gap-1">
                          {widgetConfig.quickOptions.map((opt, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded-full text-[7px] font-bold border hover:border-teal-500 transition cursor-pointer text-slate-500 whitespace-nowrap block"
                              style={{ borderColor: widgetConfig.secondaryColor + '30', color: widgetConfig.primaryColor }}
                            >
                              {opt}
                            </span>
                          ))}
                        </div>

                        {/* Text box */}
                        <div className="p-2 border-t border-slate-100 flex justify-between bg-slate-50">
                          <input 
                            type="text" 
                            disabled 
                            placeholder="Chatea con AGUADI ZAP..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 text-[9px] focus:outline-none" 
                          />
                          <button 
                            disabled 
                            className="p-1 px-1.5 text-white rounded-lg ml-1" 
                            style={{ backgroundColor: widgetConfig.secondaryColor }}
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Floating trigger button */}
                    <button 
                      onClick={() => setWidgetPreviewOpen(!widgetPreviewOpen)}
                      className="p-3 text-white rounded-full flex items-center space-x-1 hover:brightness-105 active:scale-95 transition-all shadow-xl font-bold text-xs ring-4 ring-white/10 z-10 cursor-pointer"
                      style={{ backgroundColor: widgetConfig.secondaryColor }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                      {!widgetPreviewOpen && <span className="text-[10px] tracking-tight">{widgetConfig.buttonText}</span>}
                    </button>

                  </div>

                  {/* Aesthetic backgrounds */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-slate-150 z-0 flex flex-col justify-center items-center text-center p-6 dark:from-slate-900 dark:to-slate-950">
                    <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-800 mb-2" />
                    <strong className="text-[10px] text-slate-400 tracking-wider font-bold block uppercase font-mono">Aguad Inmobiliaria</strong>
                    <span className="text-[8px] text-slate-400 mt-0.5 leading-normal max-w-[120px] block truncate">www.aguadbienesraices.com.ar</span>
                  </div>

                </div>

                {/* Simulated Home bar */}
                <div className="absolute bottom-2.5 inset-x-0 flex justify-center z-20">
                  <div className="w-24 h-1 bg-slate-800 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- Tab 5: TELEMETRY & AUDIT LOGS --- */}
      {activeTab === 'telemetry' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="telemetry-tab-stage font-sans">
          
          {/* Timeline events panel (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase">Bitácora Técnica de Eventos AGUADI ZAP</h2>
            <p className="text-slate-400 text-xs font-medium leading-normal">
              Flujo real registrado de triggers de webhook, resoluciones de clasificación lingüística del bot, derivaciones completas y fallos de API.
            </p>

            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-4 space-y-5 overflow-y-auto max-h-[420px] pr-2">
              {telemetryEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-100">
                  Ningún evento registrado aún. Dispare mensajes simulados para iniciar de forma técnica la bitácora.
                </div>
              ) : (
                telemetryEvents.map((evt) => {
                  let badge = 'text-slate-600 bg-slate-50';
                  if (evt.eventType === 'webhook_received') badge = 'text-blue-600 bg-blue-50 dark:bg-blue-900/10';
                  if (evt.eventType === 'message_sent') badge = 'text-teal-600 bg-teal-50 dark:bg-teal-900/10';
                  if (evt.eventType === 'lead_created') badge = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10';
                  if (evt.eventType === 'lead_routed') badge = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10';
                  if (evt.eventType === 'ai_error') badge = 'text-rose-600 bg-rose-50 dark:bg-rose-900/10';

                  return (
                    <div key={evt.eventId} className="relative">
                      {/* Timeline Dot icon */}
                      <span className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white dark:ring-slate-900"></span>
                      
                      <div className="text-xs">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold block uppercase tracking-wide font-mono w-fit border border-transparent ${badge}`}>
                            {evt.eventType}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-normal text-[11px] font-medium bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 dark:bg-slate-850 dark:border-slate-800/20">
                          {evt.details}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Integration variables / Credentials (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h2 className="text-xs font-black font-mono tracking-wider text-slate-400 uppercase">Credenciales & Configuración Cloud</h2>
            <p className="text-slate-400 text-xs font-medium leading-normal">
              Estado de las variables de entorno inyectadas en Cloud. La plataforma gestiona las claves de forma segura tras bambalinas.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl dark:bg-slate-850">
                <div>
                  <strong className="text-slate-800 block leading-none font-bold uppercase text-[9px] font-mono mb-0.5">GEMINI_API_KEY</strong>
                  <span className="text-[8px] text-slate-400">Gemini 3.5 Flash / Models SDK</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono border ${
                  process.env.GEMINI_API_KEY ? 'bg-emerald-50 text-emerald-600 border-teal-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {process.env.GEMINI_API_KEY ? '✓ Activa (Auto)' : '✓ Lista (Workspace)'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl dark:bg-slate-850">
                <div>
                  <strong className="text-slate-800 block leading-none font-bold uppercase text-[9px] font-mono mb-0.5">WHATSAPP_ACCESS_TOKEN</strong>
                  <span className="text-[8px] text-slate-400">Meta Graph Developer Token</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono border ${
                  process.env.WHATSAPP_ACCESS_TOKEN ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {process.env.WHATSAPP_ACCESS_TOKEN ? 'Conectada' : 'Consola local'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl dark:bg-slate-850">
                <div>
                  <strong className="text-slate-800 block leading-none font-bold uppercase text-[9px] font-mono mb-0.5">WHATSAPP_PHONE_NUMBER_ID</strong>
                  <span className="text-[8px] text-slate-400">Meta API Phone Identifier</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono border ${
                  process.env.WHATSAPP_PHONE_NUMBER_ID ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {process.env.WHATSAPP_PHONE_NUMBER_ID ? '✓ Configurado' : 'Consola local'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl dark:bg-slate-850">
                <div>
                  <strong className="text-slate-800 block leading-none font-bold uppercase text-[9px] font-mono mb-0.5">WHATSAPP_VERIFY_TOKEN</strong>
                  <span className="text-[8px] text-slate-400">Facebook Verification Handshake</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[8.5px] font-bold font-mono">
                  aguad_verify_token_2026
                </span>
              </div>
            </div>

            <div className="p-3 bg-teal-500/5 rounded-2xl border border-teal-100/30 text-xs text-teal-800 leading-normal">
              <ShieldCheck className="w-5 h-5 text-teal-500 shrink-0 mb-1.5" />
              <strong className="text-[10px] block font-bold leading-tight">Privacidad y Seguridad Corporativa:</strong>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Las conversaciones ingresadas por clientes permanecen aisladas lógicamente por organización. No se exponen datos de leads en respuestas sintéticas generales.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
