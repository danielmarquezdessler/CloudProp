import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Globe, Calendar, Clock } from 'lucide-react';

interface TopBarProps {
  currentTab: string;
  onOpenSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentTab, onOpenSidebar }) => {
  const { t, user } = useAuth();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const stringTime = now.toISOString().replace('T', ' ').substring(0, 19);
      setTime(stringTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return t.dashboard.title;
      case 'properties':
        return t.properties.title;
      case 'users':
        return t.users.title;
      case 'audit':
        return t.logs.title;
      default:
        return 'Aguad CloudProp';
    }
  };

  const getTabSubtitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return t.dashboard.welcome_message;
      case 'properties':
        return t.properties.subtitle;
      case 'users':
        return t.users.subtitle;
      case 'audit':
        return t.logs.subtitle;
      default:
        return '';
    }
  };

  if (!user) return null;

  return (
    <header 
      className="h-16 border-b border-slate-100 bg-white px-6 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 shrink-0"
      id="app-topbar"
    >
      <div className="flex items-center space-x-4">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          id="btn-sidebar-trigger-mobile"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            {getTabTitle()}
          </h2>
          <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
            {getTabSubtitle()}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* Tenant label (Rule 11) */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg dark:bg-slate-800/50 dark:border-slate-800">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            ORG: {user.orgId}
          </span>
        </div>

        {/* UTC Clock (Zero-Trust visual rhythm) */}
        <div className="flex items-center space-x-2 text-slate-500">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono font-medium tracking-tight text-slate-600 dark:text-slate-400 hidden sm:block">
            {time}
          </span>
        </div>
      </div>
    </header>
  );
};
