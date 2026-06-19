import React from 'react';
import { Bell, CheckCircle2, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  currentTab: string;
  onOpenSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSidebar }) => {
  const { user } = useAuth();

  if (!user) return null;

  const displayRole = user.role === 'super_admin' ? 'Admin' : user.role === 'agent' ? 'Agente' : 'Cliente';

  return (
    <header
      className="h-[52px] shrink-0 border-b border-[#d5dee8] bg-white px-5 text-[#003d78]"
      id="app-topbar"
    >
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-md p-1.5 text-[#0d2338] transition hover:bg-[#eef4f8] md:hidden"
            id="btn-sidebar-trigger-mobile"
            aria-label="Abrir navegaciÃ³n"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden rounded-md p-1.5 text-[#0d2338] transition hover:bg-[#eef4f8] md:block"
            aria-label="Contraer navegaciÃ³n"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="leading-tight">
            <p className="text-sm font-black text-[#003d78]">F.A CloudProp Suite</p>
            <p className="text-[11px] font-medium text-[#465875]">Aguad Bienes RaÃ­ces</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 rounded-l-full border-l border-[#e2e8ef] bg-[#f5f8fb] py-2 pl-4 pr-10 text-sm font-semibold text-[#c4c9cf] lg:flex">
            <CheckCircle2 className="h-4 w-4" />
            <span>Bienvenido a F.A CloudProp Suite</span>
          </div>
          <button type="button" className="relative text-[#003d78]" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#00dcd5]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#d6e0ea] bg-[#e8eef4]">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f0d4d4] to-[#879ab0] text-sm font-black text-white">
                {user.displayName?.charAt(0)?.toUpperCase() || 'F'}
              </div>
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-semibold text-[#0d2338]">{user.displayName}</p>
              <p className="text-[10px] font-medium text-[#0d7bb0]">{displayRole}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

