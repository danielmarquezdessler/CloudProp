import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { History, ShieldAlert, AlertCircle, RefreshCw, Clock, Filter } from 'lucide-react';
import { AuditLog } from '../types';
import { db, auth } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const AuditLogsView: React.FC = () => {
  const { user, apiFetch, t } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');

  const loadLogs = async () => {
    if (!user || user.role !== 'super_admin') return;
    setLoading(true);
    setError(null);

    if (auth.currentUser) {
      try {
        const logsRef = collection(db, 'auditLogs');
        let querySnapshot;
        try {
          querySnapshot = await getDocs(logsRef);
        } catch (rErr) {
          handleFirestoreError(rErr, OperationType.LIST, 'auditLogs');
        }
        const list: AuditLog[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(list);
      } catch (err: any) {
        setError(err.message || t.common.error);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/audit-logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || t.common.error);
      }
    } catch (err: any) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadLogs();
  }, [user]);

  useEffect(() => {
    if (actionFilter === 'all') {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(l => l.action === actionFilter));
    }
  }, [logs, actionFilter]);

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto opacity-80 mb-3" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{t.common.no_permission}</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          La consulta de la bitÃ¡cora tÃ©cnica de transacciones requiere permisos de nivel administrativo elevados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="audit-logs-view">
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl flex items-center space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filter on Action */}
        <div className="flex items-center space-x-2.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Filtrar por operación:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
            id="audit-log-action-filter"
          >
            <option value="all">Ver todas las acciones</option>
            <option value="create">Creaciones (create)</option>
            <option value="update">Modificaciones (update)</option>
            <option value="delete">Eliminaciones permanentas (delete)</option>
            <option value="login">Inicios de sesión (login)</option>
            <option value="logout">Cierres de sesión (logout)</option>
          </select>
        </div>

        {/* Sync trigger button */}
        <button
          onClick={loadLogs}
          className="px-3.5 py-2 hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 text-xs flex items-center space-x-1.5 transition dark:bg-slate-850 dark:border-slate-800 dark:text-slate-350 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refrescar Logs</span>
        </button>
      </div>

      {/* Logs Table (Fase 4 layout) */}
      {loading ? (
        <div className="flex py-24 justify-center items-center">
          <svg className="animate-spin h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center dark:bg-slate-900 dark:border-slate-800" id="empty-state-logs">
          <History className="w-12 h-12 text-slate-300 mx-auto opacity-70 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight">{t.logs.title} vacÃ­o</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{t.logs.subtitle}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800" id="audit-logs-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider dark:bg-slate-850 dark:border-slate-800 select-none">
                  <th className="py-3 px-4">{t.logs.table_time}</th>
                  <th className="py-3 px-4">{t.logs.table_action}</th>
                  <th className="py-3 px-4">{t.logs.table_user}</th>
                  <th className="py-3 px-4">{t.logs.table_details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/60 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors dark:hover:bg-slate-850/10">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-md tracking-wider ${
                        log.action === 'create' ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/20' :
                        log.action === 'delete' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                        log.action === 'login' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' :
                        log.action === 'logout' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                      {log.userEmail}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-sm font-normal">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
