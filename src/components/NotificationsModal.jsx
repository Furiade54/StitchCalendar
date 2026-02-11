import React from 'react';
import PropTypes from 'prop-types';

const NotificationsModal = ({ isOpen, onClose, notifications, onRespond }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary/5 dark:bg-primary/10 p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-primary">Notificaciones</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {notifications.length} {notifications.length === 1 ? 'nueva' : 'nuevas'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="size-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
              <p>No tienes notificaciones pendientes</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">group_add</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Solicitud de Grupo Familiar
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      <span className="font-semibold text-primary">{notification.fromUserName}</span> te ha invitado a unirte a su grupo familiar.
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => onRespond(notification.id, false)}
                    className="flex-1 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => onRespond(notification.id, true)}
                    className="flex-1 py-2 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

NotificationsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  notifications: PropTypes.array.isRequired,
  onRespond: PropTypes.func.isRequired
};

export default NotificationsModal;
