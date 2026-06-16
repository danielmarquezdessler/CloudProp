import React from 'react';
import { useAuth } from '../context/AuthContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = true,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const { t } = useAuth();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all scale-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
        id="confirm-modal-container"
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-full ${isDanger ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-primary-50 text-blue-600 dark:bg-slate-800'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100" id="confirm-modal-title">
            {title}
          </h3>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {message}
        </p>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
            id="confirm-modal-cancel"
          >
            {cancelText || t.common.cancel}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-all shadow-xs duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none' 
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'
            }`}
            id="confirm-modal-action"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t.common.loading}</span>
              </>
            ) : (
              <span>{confirmText || (isDanger ? t.common.delete : t.common.confirm)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
