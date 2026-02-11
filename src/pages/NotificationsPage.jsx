import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission, sendNotification, getNotificationPermission } from '../utils/notificationUtils';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    
    if (result === 'granted') {
      sendNotification('¡Notificaciones activadas!', {
        body: 'Ahora recibirás recordatorios de tus eventos.',
        tag: 'welcome-notification'
      });
    }
  };

  const handleTestNotification = () => {
    sendNotification('Prueba de notificación', {
      body: 'Si puedes ver esto, las notificaciones funcionan correctamente.',
      tag: 'test-notification'
    });
  };

  const getStatusColor = () => {
    switch (permission) {
      case 'granted': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      case 'denied': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      default: return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
    }
  };

  const getStatusText = () => {
    switch (permission) {
      case 'granted': return 'Activadas';
      case 'denied': return 'Bloqueadas';
      case 'unsupported': return 'No soportado';
      default: return 'Desactivadas';
    }
  };

  const getStatusIcon = () => {
    switch (permission) {
      case 'granted': return 'notifications_active';
      case 'denied': return 'notifications_off';
      case 'unsupported': return 'error';
      default: return 'notifications';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="size-10 -ml-2 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notificaciones</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
          <div className={`size-16 rounded-full flex items-center justify-center ${getStatusColor()} transition-colors`}>
            <span className="material-symbols-outlined text-3xl">{getStatusIcon()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Estado: {getStatusText()}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {permission === 'granted' 
                ? 'Recibirás alertas de tus eventos importantes.' 
                : permission === 'denied'
                  ? 'Has bloqueado las notificaciones. Habilítalas en la configuración de tu navegador.'
                  : 'Activa las notificaciones para no perderte nada.'}
            </p>
          </div>

          {permission === 'default' && (
            <button
              onClick={handleEnableNotifications}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">notifications</span>
              Activar Notificaciones
            </button>
          )}

          {permission === 'granted' && (
            <button
              onClick={handleTestNotification}
              className="w-full py-3 px-4 bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-semibold rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">send</span>
              Probar Notificación
            </button>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">Información</h3>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-slate-400">info</span>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">¿Cuándo recibiré alertas?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Las notificaciones se enviarán 10 minutos antes de cada evento programado mientras tengas la aplicación abierta o en segundo plano (si está instalada).
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-slate-400">devices</span>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Soporte de navegador</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Es posible que debas permitir las notificaciones manualmente en la barra de direcciones si las bloqueaste anteriormente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
