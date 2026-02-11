import React from 'react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'event-types',
      label: 'Gestionar Tipos de Evento',
      icon: 'category',
      description: 'Personaliza las categorías de tus eventos',
      path: '/event-types',
      color: 'text-primary bg-primary/10'
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: 'notifications',
      description: 'Gestiona tus alertas y recordatorios',
      path: '#',
      color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30'
    },
    {
      id: 'appearance',
      label: 'Apariencia',
      icon: 'palette',
      description: 'Temas, colores y diseño',
      path: '/appearance',
      color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30'
    },
    {
      id: 'account',
      label: 'Cuenta',
      icon: 'person',
      description: 'Información de perfil y seguridad',
      path: '/profile',
      color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
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
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Configuración</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.path !== '#' && navigate(item.path)}
              className={`w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary/20 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all group text-left ${item.path === '#' ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`size-12 rounded-xl flex items-center justify-center ${item.color}`}>
                  <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{item.label}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
            </button>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Stitch Calendar v0.1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;