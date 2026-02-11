import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { dataService } from '../services/dataService';

const AVAILABLE_ICONS = [
  'event',            // Cita / General
  'cake',             // Cumpleaños
  'notifications',    // Recordatorio
  'groups',           // Reunión
  'celebration',      // Evento social / Fiesta
  'work',             // Trabajo
  'medical_services', // Médico
  'family_restroom',  // Familiar
  'person',           // Personal
  'flight',           // Viaje
  'assignment',       // Trámite / Tarea
  'school',           // Educación
  'pets',             // Mascotas
  'fitness_center',   // Deporte
  'more_horiz',       // Otro
  'restaurant',       // Comida (Extra útil)
  'shopping_cart',    // Compras (Extra útil)
  'directions_car',   // Transporte (Extra útil)
  'home',             // Casa (Extra útil)
  'payments'          // Pagos (Extra útil)
];

const AVAILABLE_COLORS = [
  { name: 'Púrpura', class: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Rosa', class: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { name: 'Naranja', class: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Índigo', class: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { name: 'Azul', class: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Verde', class: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  { name: 'Rojo', class: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  { name: 'Verde Azulado', class: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
];

const EventTypesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  useEffect(() => {
    if (location.state?.openCreate) {
      openCreateModal();
      // Clear the state so it doesn't reopen on reload or back navigation
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // New Type Form State
  const [newType, setNewType] = useState({
    name: '',
    label: '',
    icon: 'event',
    color: AVAILABLE_COLORS[0],
    requires_end_time: true,
    requires_location: false,
    requires_url: false,
    default_recurring: false
  });

  useEffect(() => {
    loadEventTypes();
  }, []);

  const loadEventTypes = async () => {
    try {
      const types = await dataService.getEventTypes();
      setEventTypes(types);
    } catch (error) {
      console.error('Error al cargar tipos de eventos', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNewType({
        name: '',
        label: '',
        icon: 'event',
        color: AVAILABLE_COLORS[0],
        requires_end_time: true,
        requires_location: false,
        requires_url: false,
        default_recurring: false
    });
    setShowCreateModal(true);
  };

  const openEditModal = (type) => {
    setEditingId(type.id);
    
    // Find matching color object or default to first
    const colorObj = AVAILABLE_COLORS.find(c => c.class === type.color_class) || AVAILABLE_COLORS[0];
    
    setNewType({
        name: type.name,
        label: type.label,
        icon: type.icon,
        color: colorObj,
        requires_end_time: type.requires_end_time !== false,
        requires_location: type.requires_location === true,
        requires_url: type.requires_url === true,
        default_recurring: type.default_recurring === true
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent opening edit modal
    if (window.confirm('¿Estás seguro de que deseas eliminar este tipo de evento?')) {
      try {
        await dataService.deleteEventType(id);
        loadEventTypes();
      } catch (error) {
        console.error('Error al eliminar el tipo de evento', error);
      }
    }
  };

  const handleSave = async () => {
    if (!newType.label) return;
    
    try {
      const typeData = {
        name: newType.label.toLowerCase().replace(/\s+/g, '_'),
        label: newType.label,
        icon: newType.icon,
        color_class: newType.color.class,
        icon_bg_class: newType.color.bg,
        requires_end_time: newType.requires_end_time,
        requires_location: newType.requires_location,
        requires_url: newType.requires_url,
        default_recurring: newType.default_recurring
      };

      if (editingId) {
        await dataService.updateEventType(editingId, typeData);
      } else {
        await dataService.createEventType(typeData);
      }
      
      setShowCreateModal(false);
      loadEventTypes();
    } catch (error) {
      console.error('Error al guardar el tipo de evento', error);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="size-10 -ml-2 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tipos de Evento</h1>
          </div>
          <button 
            onClick={openCreateModal}
            className="size-9 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Nuevo Tipo"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {eventTypes.map(type => (
              <div 
                key={type.id} 
                onClick={() => openEditModal(type)}
                className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-full flex items-center justify-center ${type.icon_bg_class} ${type.color_class}`}>
                    <span className="material-symbols-outlined">{type.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{type.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {type.requires_end_time ? 'Requiere hora de fin' : 'Solo hora de inicio'}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, type.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                {editingId ? 'Editar Tipo de Evento' : 'Nuevo Tipo de Evento'}
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                <input 
                  type="text" 
                  value={newType.label}
                  onChange={(e) => setNewType({...newType, label: e.target.value})}
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
                      onClick={() => setNewType({...newType, icon})}
                      className={`flex-shrink-0 size-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                        newType.icon === icon 
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
                      onClick={() => setNewType({...newType, color})}
                      className={`flex-shrink-0 size-10 rounded-full border-2 transition-all flex items-center justify-center ${
                        newType.color.name === color.name 
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
                      checked={newType.requires_end_time}
                      onChange={(e) => setNewType({ ...newType, requires_end_time: e.target.checked })}
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
                      checked={newType.requires_location}
                      onChange={(e) => setNewType({ ...newType, requires_location: e.target.checked })}
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
                      checked={newType.requires_url}
                      onChange={(e) => setNewType({ ...newType, requires_url: e.target.checked })}
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
                      checked={newType.default_recurring}
                      onChange={(e) => setNewType({ ...newType, default_recurring: e.target.checked })}
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
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!newType.label}
                  className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Tipo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventTypesPage;