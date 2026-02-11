import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, onGoToToday, onLogout }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl backdrop-saturate-150 backdrop-brightness-110 border-r border-white/30 dark:border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-black/5 dark:border-white/5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              Stitch
            </h2>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              <li>
                <button 
                  onClick={() => handleNavigation('/')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">home</span>
                  <span className="font-medium group-hover:text-primary transition-colors">Inicio</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    onGoToToday();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">today</span>
                  <span className="font-medium group-hover:text-primary transition-colors">Ir a Hoy</span>
                </button>
              </li>
              <li className="my-2 border-t border-black/5 dark:border-white/5"></li>
              <li>
                <button 
                  onClick={() => handleNavigation('/profile')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">person</span>
                  <span className="font-medium group-hover:text-primary transition-colors">Mi Perfil</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleNavigation('/settings')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">settings</span>
                  <span className="font-medium group-hover:text-primary transition-colors">Configuración</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-black/5 dark:border-white/5">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">logout</span>
              <span className="font-medium group-hover:text-primary transition-colors">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onGoToToday: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Sidebar;
