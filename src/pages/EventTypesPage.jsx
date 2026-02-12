import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { useFeedback } from '../context/FeedbackContext';
import EventTypeModal from '../components/EventTypeModal';

const EventTypesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showConfirm } = useFeedback();
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  
  useEffect(() => {
    if (location.state?.openCreate) {
      handleOpenCreate();
      // Clear the state so it doesn't reopen on reload or back navigation
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  useEffect(() => {
    if (user) {
      loadEventTypes();
    }
  }, [user]);

  const loadEventTypes = async () => {
    try {
      setLoading(true);
      const types = await dataService.getEventTypes(user.id);
      setEventTypes(types);
    } catch (error) {
      console.error('Error al cargar tipos de eventos', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedType(null);
    setShowModal(true);
  };

  const handleOpenEdit = (type) => {
    setSelectedType(type);
    setShowModal(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent opening edit modal
    
    const confirmed = await showConfirm(
      '¿Estás seguro de que deseas eliminar este tipo de evento?',
      'Eliminar Tipo de Evento',
      { status: 'warning', confirmText: 'Eliminar', cancelText: 'Cancelar' }
    );

    if (confirmed) {
      try {
        await dataService.deleteEventType(id, user.id);
        loadEventTypes();
      } catch (error) {
        console.error('Error al eliminar el tipo de evento', error);
      }
    }
  };

  const handleSave = async (typeData) => {
    try {
      if (selectedType) {
        await dataService.updateEventType(selectedType.id, typeData, user.id);
      } else {
        await dataService.createEventType(typeData, user.id);
      }
      
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
            onClick={handleOpenCreate}
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
                onClick={() => handleOpenEdit(type)}
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

      <EventTypeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        initialData={selectedType}
        isEditing={!!selectedType}
      />
    </div>
  );
};

export default EventTypesPage;
