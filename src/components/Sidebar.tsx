import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Users, 
  History, 
  LogOut, 
  FileText, 
  Globe2,
  Menu,
  X,
  Plus,
  Database,
  Bot
} from 'lucide-react';
import { Language } from '../i18n';
import { AGUADI_ZAP_PERMISSIONS } from '../../shared/aguadiZap';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab,
  isOpen = false,
  onClose
}) => {
  const { user, logout, language, changeLanguage, t } = useAuth();

  if (!user) return null;

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (onClose) onClose();
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: t.navigation.dashboard,
      icon: Building2,
      roles: ['super_admin', 'agent', 'client']
    },
    {
      key: 'properties',
      label: t.navigation.properties,
      icon: FileText,
      roles: ['super_admin', 'agent', 'client']
    },
    {
      key: 'aguadi',
      label: 'AGUADI ZAP',
      icon: Bot,
      roles: ['super_admin', 'agent']
    },
    {
      key: 'users',
      label: t.navigation.users,
      icon: Users,
      roles: ['super_admin'] // Protected, only super_admin can see
    },
    {
      key: 'audit',
      label: t.navigation.audit,
      icon: History,
      roles: ['super_admin'] // Protected, only super_admin can see
    },
    {
      key: 'firebase-admin',
      label: 'Firebase Suite',
      icon: Database,
      roles: ['super_admin', 'agent'] // Protected, only super_admin and agent can see
    }
  ];

  // Helper to translate roles cleanly for the UI - (Rule 10)
  const getDisplayRoleName = (roleKey: string) => {
    switch(roleKey) {
      case 'super_admin': return t.users.roles.super_admin;
      case 'agent': return t.users.roles.agent;
      case 'client': return t.users.roles.client;
      default: return roleKey;
    }
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-100 flex flex-col justify-between border-r border-slate-900 transition-all duration-300 md:static md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      id="app-sidebar"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900 bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white leading-tight">
                CloudProp AI Hub
              </h1>
              <span className="text-[10px] text-teal-400 font-bold font-mono tracking-wider block -mt-0.5">
                FACUNDO AGUAD / v2.0
              </span>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            let hasPermission = item.roles.includes(user.role);

            // Respect precise permission directives for AGUADI ZAP conversion module.
            if (item.key === 'aguadi') {
              hasPermission = 
                user.role === 'super_admin' || 
                (user.permissions && user.permissions.includes('*')) || 
                (user.permissions && user.permissions.includes(AGUADI_ZAP_PERMISSIONS.legacyView)) ||
                (user.permissions && user.permissions.includes(AGUADI_ZAP_PERMISSIONS.view));
            }

            if (!hasPermission) return null;

            const IconComponent = item.icon;
            const isActive = currentTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/10'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
                id={`sidebar-link-${item.key}`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Language Switcher */}
      <div className="p-4 border-t border-slate-900 space-y-4">
        {/* Language selector */}
        <div>
          <div className="flex items-center space-x-2 px-2 pb-2">
            <Globe2 className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              IDIOMA / LANG
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-lg text-xs font-medium">
            <button
              onClick={() => changeLanguage('es')}
              className={`py-1.5 rounded-md text-center transition-all ${
                language === 'es' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`py-1.5 rounded-md text-center transition-all ${
                language === 'en' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('pt-BR')}
              className={`py-1.5 rounded-md text-center transition-all ${
                language === 'pt-BR' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PT
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm select-none shadow-md shadow-emerald-500/10 shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {user.displayName}
              </p>
              <p className="text-[10px] font-semibold text-teal-400 uppercase mt-0.5 tracking-wider truncate">
                {getDisplayRoleName(user.role)}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-colors"
            title={t.navigation.logout}
            id="btn-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
