import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Bot,
  Brain,
  Building2,
  History,
  LogOut,
  Megaphone,
  Radar,
  Route,
  Sparkles,
  Target,
  Users,
  X
} from 'lucide-react';
import logoUrl from '../assets/facundo-aguad-logo.svg';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: Building2, roles: ['super_admin', 'agent', 'client'] },
  { key: 'aguadi', label: 'AGUADI ZAP', icon: Bot, roles: ['super_admin', 'agent'] },
  { key: 'properties', label: 'Captador propietarios', icon: Route, roles: ['super_admin', 'agent', 'client'] },
  { key: 'leads', label: 'Seguimiento de leads', icon: Activity, roles: ['super_admin', 'agent'] },
  { key: 'crm', label: 'CRM Inteligente', icon: Brain, roles: ['super_admin', 'agent'] },
  { key: 'matching', label: 'Matching Inteligente', icon: Sparkles, roles: ['super_admin', 'agent'] },
  { key: 'campaigns', label: 'Campañas WhatsApp', icon: Megaphone, roles: ['super_admin', 'agent'] },
  { key: 'radar', label: 'Radar de Intención', icon: Radar, roles: ['super_admin', 'agent'] },
  { key: 'closing', label: 'Motor de cierre', icon: Target, roles: ['super_admin', 'agent'] },
  { key: 'users', label: 'Usuarios y permisos', icon: Users, roles: ['super_admin'] },
  { key: 'audit', label: 'Auditoría', icon: History, roles: ['super_admin'] }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen = false,
  onClose
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleTabChange = (tab: string) => {
    const implementedTab = ['dashboard', 'properties', 'aguadi', 'users', 'audit'].includes(tab) ? tab : 'dashboard';
    setCurrentTab(implementedTab);
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#06487c] text-white transition-transform duration-300 md:static md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      id="app-sidebar"
    >
      <div className="border-b border-white/10 px-3 pb-5 pt-2">
        <div className="flex h-[55px] items-center justify-center rounded-lg bg-white shadow-sm">
          <img src={logoUrl} alt="Facundo Aguad" className="h-9 w-[170px] object-contain" />
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-[#00dcd5]">CloudProp</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-white">Suite</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        <p className="mb-2 px-2 text-xs font-medium text-white/58">Módulos</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            let hasPermission = item.roles.includes(user.role);
            if (item.key === 'aguadi') {
              hasPermission =
                user.role === 'super_admin' ||
                user.permissions?.includes('*') ||
                user.permissions?.includes('aguadi.view');
            }
            if (!hasPermission) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.key || (!['dashboard', 'properties', 'aguadi', 'users', 'audit'].includes(item.key) && currentTab === 'dashboard');

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabChange(item.key)}
                className={`flex h-8 w-full items-center gap-3 rounded-md px-2 text-left text-sm font-bold transition ${
                  isActive ? 'bg-[#003d70] text-white' : 'text-white hover:bg-white/10'
                }`}
                id={`sidebar-link-${item.key}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/12 p-3">
        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-full items-center gap-3 rounded-md px-2 text-sm font-bold text-white transition hover:bg-white/10"
          id="btn-logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
