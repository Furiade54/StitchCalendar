import React, { createContext, useContext, useState, useCallback } from 'react';

const FeedbackContext = createContext();

export const useFeedback = () => useContext(FeedbackContext);

export const FeedbackProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm'
    status: 'info', // 'info' | 'success' | 'error' | 'warning'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar'
  });

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback((message, title = 'Información', status = 'info') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        status,
        title,
        message,
        confirmText: 'Entendido',
        onConfirm: () => {
          closeModal();
          resolve(true);
        }
      });
    });
  }, [closeModal]);

  const showConfirm = useCallback((message, title = 'Confirmar', options = {}) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        status: options.status || 'warning',
        title,
        message,
        confirmText: options.confirmText || 'Aceptar',
        cancelText: options.cancelText || 'Cancelar',
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(false);
        }
      });
    });
  }, [closeModal]);

  const getIcon = (status) => {
    switch (status) {
      case 'error': return 'error';
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getColors = (status) => {
    switch (status) {
      case 'error': return 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400';
      case 'success': return 'bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <FeedbackContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                 <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${getColors(modalState.status)}`}>
                    <span className="material-symbols-outlined">
                        {getIcon(modalState.status)}
                    </span>
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {modalState.title}
                 </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed ml-1">
                {modalState.message}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
              {modalState.type === 'confirm' && (
                  <button 
                    onClick={modalState.onCancel}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {modalState.cancelText}
                  </button>
              )}
              <button 
                onClick={modalState.onConfirm}
                className={`px-6 py-2 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm ${
                    modalState.status === 'error' || (modalState.type === 'confirm' && modalState.status === 'warning') 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-slate-900 dark:bg-white dark:text-slate-900'
                }`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};
