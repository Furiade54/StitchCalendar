import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, THEMES } from '../hooks/useTheme';

const AppearancePage = () => {
  const navigate = useNavigate();
  const { 
    theme, 
    toggleTheme, 
    colorTheme, 
    changeColorTheme, 
    customColor, 
    updateCustomColor,
    customBackgroundColor,
    updateCustomBackgroundColor,
    resetCustomBackgroundColor
  } = useTheme();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
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
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Apariencia</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-8">
        
        {/* Dark Mode Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Modo de visualización</h2>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-1 flex">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                theme === 'light' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">light_mode</span>
              Claro
            </button>
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
              Oscuro
            </button>
          </div>
        </section>

        {/* Color Themes Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Tema de color</h2>
          <div className="grid grid-cols-1 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => changeColorTheme(t.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  colorTheme === t.id
                    ? 'bg-primary/5 border-primary ring-1 ring-primary'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="size-10 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden"
                    style={{ backgroundColor: t.id === 'custom' ? customColor : t.color }}
                  >
                    {t.id === 'custom' && (
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => updateCustomColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        onClick={(e) => e.stopPropagation()} 
                      />
                    )}
                    
                    {colorTheme === t.id && (
                      t.id === 'custom' ? (
                        <span className="material-symbols-outlined text-white text-[20px] pointer-events-none drop-shadow-md">edit</span>
                      ) : (
                        <span className="material-symbols-outlined text-white text-[20px] drop-shadow-md">check</span>
                      )
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`font-semibold ${colorTheme === t.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                      {t.name}
                    </span>
                    {t.id === 'custom' && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {colorTheme === t.id ? 'Toca el círculo para cambiar color' : 'Selecciona para personalizar'}
                      </span>
                    )}
                  </div>
                </div>
                
                {colorTheme === t.id && (
                  <div className="size-2 rounded-full bg-primary"></div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Background Color Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Color de Fondo</h2>
            {customBackgroundColor && (
              <button 
                onClick={resetCustomBackgroundColor}
                className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Restablecer
              </button>
            )}
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-background-light dark:bg-background-dark border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <input
                  type="color"
                  value={customBackgroundColor || (theme === 'dark' ? '#111418' : '#f6f7f8')}
                  onChange={(e) => updateCustomBackgroundColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Personalizado
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {customBackgroundColor || 'Por defecto'}
                </span>
              </div>
            </div>
            <div className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-mono">
              {customBackgroundColor || (theme === 'dark' ? '#111418' : '#f6f7f8')}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppearancePage;