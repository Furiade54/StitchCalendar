import React, { useState, useEffect } from 'react';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from '../utils/constants';

const EventTypeModal = ({ isOpen, onClose, onSave, initialData = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    icon: 'event',
    color: AVAILABLE_COLORS[0],
    requires_end_time: true,
    requires_location: false,
    requires_url: false,
    default_recurring: false
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Find matching color object or default to first
        const colorObj = AVAILABLE_COLORS.find(c => c.class === initialData.color_class) || AVAILABLE_COLORS[0];
        
        setFormData({
            name: initialData.name || initialData.label, // Fallback to label if name is missing (compat)
            icon: initialData.icon,
            color: colorObj,
            requires_end_time: initialData.requires_end_time !== false,
            requires_location: initialData.requires_location === true,
            requires_url: initialData.requires_url === true,
            default_recurring: initialData.default_recurring === true
        });
      } else {
        // Reset form for new entry
        setFormData({
            name: '',
            icon: 'event',
            color: AVAILABLE_COLORS[0],
            requires_end_time: true,
            requires_location: false,
            requires_url: false,
            default_recurring: false
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!formData.name) return;
    
    const typeData = {
      name: formData.name.trim(), // Use name directly without slugifying
      icon: formData.icon,
      color_class: formData.color.class,
      icon_bg_class: formData.color.bg,
      requires_end_time: formData.requires_end_time,
      requires_location: formData.requires_location,
      requires_url: formData.requires_url,
      default_recurring: formData.default_recurring
    };

    await onSave(typeData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            {isEditing ? 'Editar Tipo de Evento' : 'Nuevo Tipo de Evento'}
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="ej. Gimnasio, Viaje, Almuerzo"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ícono</label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {AVAILABLE_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setFormData({...formData, icon})}
                  className={`flex-shrink-0 size-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                    formData.icon === icon 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color</label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {AVAILABLE_COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => setFormData({...formData, color})}
                  className={`flex-shrink-0 size-10 rounded-full border-2 transition-all flex items-center justify-center ${
                    formData.color.name === color.name 
                      ? 'border-slate-900 dark:border-white scale-110' 
                      : 'border-transparent'
                  }`}
                >
                  <div className={`size-8 rounded-full ${color.class.replace('text-', 'bg-').replace('-500', '-500').replace('-600', '-600')}`}></div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Configuración</label>
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="requiresEnd"
                  checked={formData.requires_end_time}
                  onChange={(e) => setFormData({ ...formData, requires_end_time: e.target.checked })}
                  className="size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="requiresEnd" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                  Requiere hora de fin
                  <span className="block text-xs text-slate-400 font-normal">Si se desactiva, el evento durará todo el día o una hora por defecto.</span>
                </label>
              </div>
              
              <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="requiresLocation"
                  checked={formData.requires_location}
                  onChange={(e) => setFormData({ ...formData, requires_location: e.target.checked })}
                  className="size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="requiresLocation" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                  Requiere ubicación
                  <span className="block text-xs text-slate-400 font-normal">Muestra el campo de dirección o lugar.</span>
                </label>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="requiresUrl"
                  checked={formData.requires_url}
                  onChange={(e) => setFormData({ ...formData, requires_url: e.target.checked })}
                  className="size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="requiresUrl" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                  Requiere enlace de reunión
                  <span className="block text-xs text-slate-400 font-normal">Habilita campo para Zoom, Meet, Teams, etc.</span>
                </label>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="defaultRecurring"
                  checked={formData.default_recurring}
                  onChange={(e) => setFormData({ ...formData, default_recurring: e.target.checked })}
                  className="size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="defaultRecurring" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                  Recurrente por defecto
                  <span className="block text-xs text-slate-400 font-normal">Sugerir repetición (ej. cumpleaños anuales).</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!formData.label}
              className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Tipo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTypeModal;