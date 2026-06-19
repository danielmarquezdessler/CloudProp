import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Search,
  Mail,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Check,
  X,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Wrench,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { User, Role, UserStatus, EmailAvailabilityResponse } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const UsersView: React.FC = () => {
  const { user, apiFetch, t } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email availability check states
  const [emailCheckInput, setEmailCheckInput] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkResult, setCheckResult] = useState<EmailAvailabilityResponse | null>(null);
  const [repairingMode, setRepairingMode] = useState(false);

  // User form (create & edit) states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    uid: '',
    email: '',
    displayName: '',
    role: 'client' as Role,
    status: 'active' as UserStatus,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Deletion state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    if (auth.currentUser) {
      try {
        const usersRef = collection(db, 'users');
        let querySnapshot;
        try {
          querySnapshot = await getDocs(usersRef);
        } catch (rErr) {
          handleFirestoreError(rErr, OperationType.LIST, 'users');
        }
        const list: User[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ uid: docSnap.id, ...docSnap.data() } as User);
        });
        setUsers(list);
      } catch (err: any) {
        setError(err.message || t.common.error);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
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
    loadUsers();
  }, [user]);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCheckInput.trim()) return;
    setCheckingEmail(true);
    setCheckResult(null);
    try {
      const res = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(emailCheckInput.trim())}`);
      const data = await res.json();
      if (data.success) {
        setCheckResult(data);
      } else {
        setError(data.error || "Error al verificar correo.");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con servidor.");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRepairEmail = async (email: string) => {
    setRepairingMode(true);
    try {
      const res = await apiFetch('/api/auth/repair', {
        method: 'POST',
        body: JSON.stringify({ email, repairOption: 'auto' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "La cuenta ha sido reparada con éxito.");
        setTimeout(() => setSuccessMsg(null), 5000);
        setCheckResult(null);
        setEmailCheckInput('');
        loadUsers();
      } else {
        setError(data.message || "La reparación falló.");
      }
    } catch (err: any) {
      setError(err.message || "No se pudo conectar.");
    } finally {
      setRepairingMode(false);
    }
  };

  const handleOpenCreateForm = () => {
    setFormMode('create');
    setFormData({
      uid: '',
      email: '',
      displayName: '',
      role: 'client',
      status: 'active',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (targetUser: User) => {
    setFormMode('edit');
    setFormData({
      uid: targetUser.uid,
      email: targetUser.email,
      displayName: targetUser.displayName,
      role: targetUser.role,
      status: targetUser.status,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.displayName.trim()) return setFormError("El nombre es requerido.");
    if (!formData.email.trim()) return setFormError("El correo electrónico es requerido.");
    if (formMode === 'create') {
      setFormError("La creación de usuarios debe realizarse desde backend seguro con Firebase Admin SDK.");
      return;
    }

    setFormSubmitting(true);

    if (auth.currentUser) {
      try {
        if (formMode === 'create') {
          throw new Error("La creación de usuarios debe realizarse desde backend seguro con Firebase Admin SDK.");
        } else {
          const userDocRef = doc(db, 'users', formData.uid);
          const updateData = {
            displayName: formData.displayName,
            role: formData.role,
            status: formData.status,
            updatedAt: new Date().toISOString()
          };
          try {
            await updateDoc(userDocRef, updateData);
          } catch (wErr) {
            handleFirestoreError(wErr, OperationType.UPDATE, `users/${formData.uid}`);
          }
        }
        setSuccessMsg(formMode === 'create' ? t.users.create_success : t.common.success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsFormOpen(false);
        loadUsers();
      } catch (err: any) {
        setFormError(err.message || t.common.error);
      } finally {
        setFormSubmitting(false);
      }
      return;
    }

    try {
      const endpoint = '/api/users/update';
      const body = {
        targetUid: formData.uid,
        displayName: formData.displayName,
        email: formData.email,
        role: formData.role,
        status: formData.status
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(formMode === 'create' ? t.users.create_success : t.common.success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsFormOpen(false);
        loadUsers();
      } else {
        setFormError(data.error || "operación denegada.");
      }
    } catch (err: any) {
      setFormError(err.message || t.common.error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTriggerDelete = (uid: string) => {
    if (uid === user?.uid) {
      setError("No puede eliminarse usted mismo.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    setDeleteUserId(uid);
  };

  const handleConfirmDelete = async () => {
    if (!deleteUserId) return;
    setIsDeleting(true);

    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', deleteUserId);
        try {
          await deleteDoc(userDocRef);
        } catch (wErr) {
          handleFirestoreError(wErr, OperationType.DELETE, `users/${deleteUserId}`);
        }
        setSuccessMsg(t.users.delete_success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setDeleteUserId(null);
        loadUsers();
      } catch (err: any) {
        setError(err.message || "No se ha podido eliminar el usuario.");
        setTimeout(() => setError(null), 5000);
        setDeleteUserId(null);
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/users/delete', {
        method: 'POST',
        body: JSON.stringify({ targetUid: deleteUserId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(t.users.delete_success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setDeleteUserId(null);
        loadUsers();
      } else {
        setError(data.error || "No se ha podido eliminar el usuario.");
        setTimeout(() => setError(null), 5000);
        setDeleteUserId(null);
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar.");
      setDeleteUserId(null);
    } finally {
      setIsDeleting(false);
    }
  };


  if (!user || user.role !== 'super_admin') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center" id="users-view-unauthorized">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto opacity-80 mb-3" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{t.common.no_permission}</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal">
          Este módulo técnico de gestión e índices está restringido estrictamente para cuentas con el nivel de acceso <strong className="text-rose-500 font-semibold uppercase">super_admin</strong>. (Pilar 6 de aislamiento).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="users-view">
      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 text-xs shadow-xs animate-fade-in">
          <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl flex items-center space-x-3 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Email verification widget (Rule 7) */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight border-b border-slate-50 pb-3 dark:border-slate-800">
              {t.users.email_check_title}
            </h3>
            <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">
              {t.users.email_check_desc}
            </p>

            <form onSubmit={handleCheckEmail} className="space-y-3 mt-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  placeholder="ejemplo@bienesraices.com"
                  value={emailCheckInput}
                  onChange={(e) => setEmailCheckInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={checkingEmail}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-850 flex items-center justify-center space-x-1.5 transition cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                {checkingEmail ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>{t.users.check_btn}</span>
                  </>
                )}
              </button>
            </form>

            {/* Verification Results Panel */}
            {checkResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 dark:bg-slate-800/40 dark:border-slate-800 text-xs animate-fade-in" id="email-verification-result">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Email analizado:</span>
                  <p className="font-bold text-slate-700 dark:text-slate-300 word-break">{checkResult.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded-lg border border-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center space-x-1">
                    {checkResult.authExists ? <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <span className="text-slate-500 font-medium">Auth</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {checkResult.firestoreExists ? <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <span className="text-slate-500 font-medium">Firestore</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Estado Técnico:</span>
                  <div className={`p-2 rounded-lg font-bold text-center text-[10px] uppercase tracking-wider ${
                    checkResult.consistencyStatus === 'available' ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/20' :
                    checkResult.consistencyStatus === 'active_user_exists' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' :
                    'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                  }`}>
                    {checkResult.consistencyStatus === 'available' ? t.users.statuses.active :
                     checkResult.consistencyStatus === 'active_user_exists' ? "ACTIVO COMPLETO" :
                     "INCONSISTENCIA / HUÉRFANO"}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-normal">
                  <strong className="text-slate-700 dark:text-slate-300 font-bold block">Acción recomendada:</strong>
                  {checkResult.recommendedAction}
                </p>

                {/* Repair action button */}
                {checkResult.canRepair && (
                  <button
                    onClick={() => handleRepairEmail(checkResult.email)}
                    disabled={repairingMode}
                    className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 transition text-[10px] cursor-pointer shadow-xs shadow-amber-200 dark:shadow-none"
                    id="btn-repair-account"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{repairingMode ? "Reparando..." : t.users.repair_btn}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Directory List Column & Create Command (Rule 15) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Cuentas del Personal</h3>
                <p className="text-[10px] text-slate-400">{t.users.subtitle}</p>
              </div>
              <button
                onClick={handleOpenCreateForm}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-xs text-white font-bold rounded-xl shadow-md shadow-teal-500/15 hover:opacity-95 flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-auto"
                id="btn-create-user-dialog"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.users.add_new}</span>
              </button>
            </div>

            {/* Directory Table */}
            <div className="overflow-x-auto mt-4 rounded-xl border border-slate-50 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider dark:bg-slate-800/40 dark:border-slate-800 select-none">
                    <th className="py-3 px-4">{t.users.form.name}</th>
                    <th className="py-3 px-4">{t.users.form.role}</th>
                    <th className="py-3 px-4">{t.users.form.status}</th>
                    <th className="py-3 px-4 text-right">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 dark:divide-slate-850">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/30 transition-colors duration-150 dark:hover:bg-slate-800/10">
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <div>
                          <p className="font-bold leading-none">{u.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">{u.email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-md ${
                          u.role === 'super_admin' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                          u.role === 'agent' ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/20' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {u.role === 'super_admin' ? t.users.roles.super_admin : u.role === 'agent' ? t.users.roles.agent : t.users.roles.client}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 text-[9px] font-bold rounded-lg ${
                          u.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                          'bg-rose-50 text-rose-600 dark:bg-rose-950/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{u.status === 'active' ? t.users.statuses.active : t.users.statuses.suspended}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditForm(u)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors dark:hover:bg-slate-800"
                            title="Editar usuario"
                            id={`btn-edit-user-${u.uid}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTriggerDelete(u.uid)}
                            disabled={u.uid === user.uid}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.uid === user.uid
                                ? 'text-slate-300 cursor-not-allowed dark:text-slate-700'
                                : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                            }`}
                            title={u.uid === user.uid ? "No te puedes auto-eliminar" : "Eliminar permanentemente"}
                            id={`btn-delete-user-${u.uid}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- USER SAVE DIALOG: CREATE & EDIT (Rule 4 / 6 / 15) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:bg-slate-900 dark:border-slate-800"
            id="user-form-modal"
          >
            {/* Header */}
            <div className="h-16 border-b border-slate-50 px-6 flex items-center justify-between dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                {formMode === 'create' ? t.users.add_new : "Modificar Perfil de Usuario"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formMode === 'create' && (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl flex items-center space-x-3 text-xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="font-semibold">La creación de usuarios debe realizarse desde backend seguro con Firebase Admin SDK.</span>
                </div>
              )}

              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl flex items-center space-x-3 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.users.form.name}
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleFormInputChange}
                  placeholder="Juan Perez"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Email (Normalized on save) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.users.form.email}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled={formMode === 'edit'} // Lock email during edits to preserve consistency
                  onChange={handleFormInputChange}
                  placeholder="emp@aguadbienesraices.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Role technical selection (Rule 10) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.users.form.role}
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormInputChange}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                >
                  <option value="client">{t.users.roles.client}</option>
                  <option value="agent">{t.users.roles.agent}</option>
                  <option value="super_admin">{t.users.roles.super_admin}</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.users.form.status}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormInputChange}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                >
                  <option value="active">{t.users.statuses.active}</option>
                  <option value="suspended">{t.users.statuses.suspended}</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-50 mt-6 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs flex items-center justify-center space-x-1.5"
                  id="user-form-submit-btn"
                >
                  {formSubmitting ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span>{t.common.save}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation of permanent delete */}
      <ConfirmModal
        isOpen={deleteUserId !== null}
        title="¿Eliminar Usuario de forma Definitiva?"
        message={t.users.delete_confirm}
        confirmText="Eliminar permanentemente"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteUserId(null)}
      />
    </div>
  );
};
