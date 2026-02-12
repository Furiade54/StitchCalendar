import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EVENT_STATUS } from '../utils/constants';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { AVAILABLE_COLORS, AVAILABLE_ICONS } from '../utils/constants';

const EventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useFeedback();
  
  // Determine effective user ID (context)
  // If passed in state, use it; otherwise default to logged-in user
  const targetUserId = location.state?.userId || user?.id;
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setCanEdit(false);
        return;
      }
      if (targetUserId === user.id) {
        setCanEdit(true);
        return;
      }
      try {
        const permitted = await dataService.canEdit(targetUserId, user.id);
        setCanEdit(permitted);
      } catch (err) {
        console.error("Error checking edit permissions:", err);
        setCanEdit(false);
      }
    };
    checkPermission();
  }, [targetUserId, user]);

  const isNew = id === 'new';
  
  const [event, setEvent] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditing, setIsEditing] = useState(isNew);
  const [editedEvent, setEditedEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  
  // Sharing State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedShareMembers, setSelectedShareMembers] = useState([]);
  const [shareWithFamily, setShareWithFamily] = useState(false);

  useEffect(() => {
    const fetchFamily = async () => {
        if (user) {
            try {
                const members = await dataService.getFamilyMembers(user.id);
                setFamilyMembers(members);
            } catch (err) {
                console.error("Error fetching family members", err);
            }
        }
    };
    fetchFamily();
  }, [user]);

  useEffect(() => {
    if (event && event.shared_with) {
        setShareWithFamily(event.shared_with.includes('family'));
        setSelectedShareMembers(event.shared_with.filter(id => id !== 'family'));
    } else {
        setShareWithFamily(false);
        setSelectedShareMembers([]);
    }
  }, [event]);

  const handleShareSave = async () => {
    try {
        const shareList = [...selectedShareMembers];
        if (shareWithFamily) shareList.push('family');
        
        // Optimistic update
        const updatedEvent = { ...event, shared_with: shareList };
        setEvent(updatedEvent);
        
        // Pass user.id as requesting user (though shareEvent logic is slightly different, 
        // usually only owner can share. But if I have edit permission, maybe I can share? 
        // For now let's assume only owner or allowed editor can share.
        // dataService.shareEvent uses index finding by userId, so we need to be careful.
        // If I am editing someone else's event, shareEvent might need update to support targetUserId lookup.
        // Let's assume shareEvent needs update or we use updateEvent for sharing too?
        // Actually dataService.shareEvent takes (eventId, targetIds, userId). 
        // The third arg is used to FIND the event: e.user_id === userId.
        // So we MUST pass targetUserId here if we are on someone else's calendar.
        await dataService.shareEvent(event.id, shareList, targetUserId);
        setShareModalOpen(false);
    } catch (error) {
        console.error(error);
        await showAlert(error.message, 'Error al compartir', { status: 'error' });
        // Revert on error could be added here
    }
  };

  const toggleShareMember = (memberId) => {
      if (selectedShareMembers.includes(memberId)) {
          setSelectedShareMembers(selectedShareMembers.filter(id => id !== memberId));
      } else {
          setSelectedShareMembers([...selectedShareMembers, memberId]);
      }
  };

  // Load event types
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await dataService.getEventTypes(targetUserId);
        setEventTypes(types);
      } catch (err) {
        console.error('Failed to load event types', err);
      } finally {
        setTypesLoading(false);
      }
    };
    if (targetUserId) {
      loadTypes();
    }
  }, [targetUserId]);

  // Initialize data
  useEffect(() => {
    // Wait for event types to be loaded before initializing new event
    if (typesLoading) return;

    const loadEvent = async () => {
      if (isNew) {
        // Initialize new event with defaults or data passed in navigation state
        const initialDate = location.state?.currentDate ? new Date(location.state.currentDate) : new Date();
        const initialDay = location.state?.selectedDay || initialDate.getDate();
        
        // Format date strings for inputs (YYYY-MM-DDTHH:mm)
        const startDate = new Date(initialDate);
        startDate.setDate(initialDay);
        startDate.setHours(9, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(10, 0, 0, 0);

        // Default type
        const defaultType = eventTypes.length > 0 ? eventTypes[0] : null;
        
        const newEventTemplate = {
          title: '',
          eventType: defaultType?.name || 'cita',
          status: EVENT_STATUS.SCHEDULED,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          day: initialDay,
          notes: '',
          isRecurring: false,
          recurrencePattern: 'weekly',
          colorClass: defaultType?.color_class || AVAILABLE_COLORS[0].class,
          iconBgClass: defaultType?.icon_bg_class || AVAILABLE_COLORS[0].bg,
          icon: defaultType?.icon || AVAILABLE_ICONS[0]
        };
        
        setEvent(newEventTemplate);
        setEditedEvent(newEventTemplate);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const eventData = await dataService.getEventById(id, targetUserId);
        setEvent(eventData);
        setEditedEvent({ ...eventData });
      } catch (err) {
        console.error(err);
        setError('Event not found or access denied');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [id, isNew, location.state, targetUserId, typesLoading]);

  const handleTypeChange = (typeName) => {
    const typeConfig = eventTypes.find(t => t.name === typeName);
    if (!typeConfig) return;
    
    // Logic to reset end date if switching to a type that doesn't need it
    let newEndDate = editedEvent.endDate;
    if (!typeConfig.requires_end_time) {
       // For single-point events, ensure consistency, though we hide the field
       newEndDate = editedEvent.startDate; 
    }

    setEditedEvent({
      ...editedEvent,
      eventType: typeName,
      event_type_id: typeConfig.id,
      endDate: newEndDate,
      icon: typeConfig.icon,
      colorClass: typeConfig.color_class,
      iconBgClass: typeConfig.icon_bg_class,
      isRecurring: typeConfig.default_recurring || editedEvent.isRecurring // Apply default if set, otherwise keep current
    });
  };

  const currentEventTypeConfig = eventTypes.find(t => t.name === editedEvent?.eventType) || {};
  const requiresEndTime = currentEventTypeConfig.requires_end_time !== false; 
  const requiresLocation = currentEventTypeConfig.requires_location === true;
  const requiresUrl = currentEventTypeConfig.requires_url === true;
  const defaultRecurring = currentEventTypeConfig.default_recurring === true;

  const handleToggleImportant = async () => {
    if (!canEdit) return; // Prevent action if read-only

    if (isEditing) {
       setEditedEvent({ ...editedEvent, isImportant: !editedEvent.isImportant });
    } else {
       // Direct update in view mode
       const updatedEvent = { ...event, isImportant: !event.isImportant };
       setEvent(updatedEvent); // Optimistic UI
       try {
         await dataService.updateEvent(updatedEvent, targetUserId, user.id);
       } catch (err) {
         console.error('Failed to update importance', err);
         // Revert on error
         setEvent(event);
       }
    }
  };

  const handleStartDateChange = (e) => {
     const newStart = e.target.value;
     // If end date is hidden, keep it synced with start date automatically
     if (!requiresEndTime) {
        setEditedEvent({ ...editedEvent, startDate: newStart, endDate: newStart });
     } else {
        // Auto-adjust End Date to be at least 1 hour after Start Date if it's earlier or equal
        const startDateObj = new Date(newStart);
        const currentEndDateObj = new Date(editedEvent.endDate);
        
        // Add 1 hour to start date
        const minEndDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000); // +1 hour

        // If current end date is invalid or less than (start + 1h), update it
        if (!editedEvent.endDate || currentEndDateObj <= startDateObj || currentEndDateObj < minEndDateObj) {
            // Format to datetime-local string (YYYY-MM-DDTHH:mm)
            // Handling timezone offset manually to avoid UTC conversion issues with toISOString
            const year = minEndDateObj.getFullYear();
            const month = String(minEndDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(minEndDateObj.getDate()).padStart(2, '0');
            const hours = String(minEndDateObj.getHours()).padStart(2, '0');
            const minutes = String(minEndDateObj.getMinutes()).padStart(2, '0');
            
            const newEndDateString = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            setEditedEvent({ ...editedEvent, startDate: newStart, endDate: newEndDateString });
        } else {
            setEditedEvent({ ...editedEvent, startDate: newStart });
        }
     }
  };

  const handleDelete = async () => {
    if (!canEdit) return;

    const confirmed = await showConfirm(
      '¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.',
      'Eliminar Evento',
      { status: 'error', confirmText: 'Eliminar', cancelText: 'Cancelar' }
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await dataService.deleteEvent(event.id, targetUserId, user.id);
      navigate(-1); // Go back
    } catch (err) {
      console.error(err);
      setError('Failed to delete event');
      setIsDeleting(false);
    }
  };

  const handleJoin = () => {
    if (event?.meetingUrl) {
      window.open(event.meetingUrl, '_blank');
    }
    setHasJoined(true);
  };

  const handleSave = async () => {
    if (!editedEvent) return;
    if (!canEdit) {
        await showAlert("No tienes permiso para editar este calendario.", "Acceso Denegado", { status: 'error' });
        return;
    }

    setIsSaving(true);
    
    try {
      if (isNew) {
        await dataService.addEvent(editedEvent, targetUserId, user.id);
      } else {
        await dataService.updateEvent(editedEvent, targetUserId, user.id);
      }
      navigate(-1); // Go back after save
    } catch (err) {
      console.error('Failed to save event:', err);
      // Could add error notification here
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">error</span>
        <p className="text-slate-600 dark:text-slate-300 mb-4">{error || 'Evento no encontrado'}</p>
        <button onClick={handleBack} className="text-primary font-semibold hover:underline">
          Volver al calendario
        </button>
      </div>
    );
  }

  // Helper to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTimeRange = (start, end) => {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${e.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col w-full relative">
      {/* App Bar (Consistent with CalendarPage) */}
      <div className="bg-white dark:bg-surface-dark px-6 pt-4 pb-2 flex justify-between items-center shrink-0">
        <div className="text-xs font-bold text-primary uppercase tracking-wider">
          Stitch Calendar
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={() => navigate('/profile')}
            className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors overflow-hidden"
          >
             {user?.avatar_url && (user.avatar_url.startsWith('http') || user.avatar_url.startsWith('/')) ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
                <span className="material-symbols-outlined text-xl">{user?.avatar_url || 'account_circle'}</span>
             )}
          </button>
        </div>
      </div>

      {/* Page Navigation Header */}
      <div className="bg-white dark:bg-surface-dark shadow-sm border-b border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4 shrink-0 z-10">
        <button 
          onClick={handleBack}
          className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        
        <h1 className="text-xl font-bold text-slate-800 dark:text-white truncate flex-1">
          {isNew ? 'Nuevo Evento' : (isEditing ? 'Editar Evento' : 'Detalles del Evento')}
        </h1>

        {!isNew && !isEditing && canEdit && (
            <button
                onClick={() => setShareModalOpen(true)}
                className={`size-10 flex items-center justify-center rounded-full transition-colors ${
                  (event?.shared_with && event.shared_with.length > 0)
                    ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}
                title="Compartir evento"
            >
                 <span className={`material-symbols-outlined ${
                   (event?.shared_with && event.shared_with.length > 0) ? 'filled-icon' : ''
                 }`}>share</span>
            </button>
        )}

        <button
            onClick={handleToggleImportant}
            disabled={!canEdit}
            className={`size-10 flex items-center justify-center rounded-full transition-colors ${
              (isEditing ? editedEvent?.isImportant : event?.isImportant) 
                ? 'bg-amber-50 text-amber-400 dark:bg-amber-900/20' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'
            } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Marcar como importante"
        >
             <span className={`material-symbols-outlined ${
               (isEditing ? editedEvent?.isImportant : event?.isImportant) ? 'filled-icon' : ''
             }`}>star</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {isEditing ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
             {/* 1. Type Selection (Horizontal Scroll) */}
             <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Evento</label>
                </div>
                <div className="flex gap-3 overflow-x-auto py-2 -mx-6 px-6 scrollbar-hide pb-4">
                  {eventTypes.map(type => {
                    const isSelected = editedEvent.eventType === type.name;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeChange(type.name)}
                        className={`flex flex-col items-center justify-center min-w-[6rem] p-3 rounded-2xl transition-all border-2 ${
                          isSelected 
                            ? 'bg-white dark:bg-slate-700 border-primary shadow-md shadow-primary/20 scale-105' 
                            : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className={`size-12 rounded-full flex items-center justify-center mb-2 transition-transform ${isSelected ? 'scale-110' : ''} ${type.icon_bg_class} ${type.color_class}`}>
                          <span className="material-symbols-outlined text-2xl">{type.icon}</span>
                        </div>
                        <span className={`text-xs font-medium capitalize whitespace-nowrap ${isSelected ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                          {type.label}
                        </span>
                        {isSelected && <div className="mt-1 size-1.5 rounded-full bg-primary"></div>}
                      </button>
                    );
                  })}
                  
                  {/* Create New Type Button */}
                  <button
                    onClick={() => navigate('/event-types', { state: { openCreate: true } })}
                    className="flex flex-col items-center justify-center min-w-[6rem] p-3 rounded-2xl transition-all border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary/50 hover:bg-primary/5 group"
                  >
                    <div className="size-12 rounded-full flex items-center justify-center mb-2 bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <span className="material-symbols-outlined text-2xl">add</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400 group-hover:text-primary transition-colors whitespace-nowrap">
                      Nuevo Tipo
                    </span>
                  </button>
                </div>
             </div>

             {/* 2. Title Input */}
             <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                <input 
                  type="text" 
                  value={editedEvent.title} 
                  onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                  placeholder="Título del evento"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-lg font-medium placeholder:text-slate-400"
                />
              </div>

              {/* 3. Time Range */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`${!requiresEndTime ? 'col-span-2' : ''}`}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {(!requiresEndTime) ? 'Fecha' : 'Inicio'}
                    </label>
                    <input 
                      type="datetime-local" 
                      value={editedEvent.startDate ? editedEvent.startDate.slice(0, 16) : ''} 
                      onChange={handleStartDateChange}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                  
                  {/* Hide End Date for Birthday/Reminder */}
                  {(requiresEndTime) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Fin</label>
                      <input 
                        type="datetime-local" 
                        value={editedEvent.endDate ? editedEvent.endDate.slice(0, 16) : ''} 
                        onChange={(e) => setEditedEvent({ ...editedEvent, endDate: e.target.value })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Details (Status, Notes, etc) */}
              <div className="space-y-4 pt-2">
                 {/* Location & Meeting URL */}
                 <div className="grid grid-cols-1 gap-4">
                    {requiresLocation && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ubicación</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400">location_on</span>
                        <input 
                          type="text" 
                          value={editedEvent.location || ''} 
                          onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                          placeholder="Añadir ubicación"
                          className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    )}

                    {requiresUrl && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Enlace de Reunión</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400">link</span>
                          <input 
                            type="url" 
                            value={editedEvent.meetingUrl || ''} 
                            onChange={(e) => setEditedEvent({ ...editedEvent, meetingUrl: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    )}
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas</label>
                    <textarea 
                      value={editedEvent.notes || ''} 
                      onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
                      placeholder="Añadir detalles, ubicación o notas..."
                      rows="3"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                      <div className="relative">
                        <select 
                          value={editedEvent.status || EVENT_STATUS.SCHEDULED}
                          onChange={(e) => setEditedEvent({ ...editedEvent, status: e.target.value })}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none text-sm"
                        >
                          {Object.values(EVENT_STATUS).map(status => (
                            <option key={status} value={status} className="capitalize">{status}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-lg">expand_more</span>
                      </div>
                    </div>
                 </div>
              </div>
                 <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="isRecurring"
                            checked={editedEvent.isRecurring || false}
                            onChange={(e) => setEditedEvent({ ...editedEvent, isRecurring: e.target.checked })}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700 dark:text-slate-300">Evento Recurrente</label>
                      </div>
                    </div>
                    
                    {editedEvent.isRecurring && (
                      <div className="flex-1 animate-in slide-in-from-right-4 duration-300">
                        <select
                          value={editedEvent.recurrencePattern || 'weekly'}
                          onChange={(e) => setEditedEvent({ ...editedEvent, recurrencePattern: e.target.value })}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="daily">Diariamente</option>
                          <option value="weekly">Semanalmente</option>
                          <option value="monthly">Mensualmente</option>
                          <option value="yearly">Anualmente</option>
                        </select>
                      </div>
                    )}
                 </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{event.title}</h1>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                event.status === EVENT_STATUS.COMPLETED ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                event.status === EVENT_STATUS.CANCELLED ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                event.status === EVENT_STATUS.OVERDUE ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                event.status === EVENT_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {event.status}
              </span>
            </div>
            
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mb-8">
              {formatTimeRange(event.startDate, event.endDate)}
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-slate-500">calendar_month</span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Fecha</p>
                  <p className="font-medium">{formatDate(event.startDate)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-slate-500">category</span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tipo</p>
                  <p className="font-medium capitalize">{event.eventType}</p>
                </div>
              </div>

              {event.isRecurring && (
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-500">repeat</span>
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Recurrencia</p>
                     <p className="font-medium capitalize">
                       Se repite {
                         {
                           daily: 'diariamente',
                           weekly: 'semanalmente',
                           monthly: 'mensualmente',
                           yearly: 'anualmente'
                         }[event.recurrencePattern || 'weekly']
                       }
                     </p>
                  </div>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-500">location_on</span>
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Ubicación</p>
                     <p className="font-medium">{event.location}</p>
                  </div>
                </div>
              )}

              {(event.shared_with && event.shared_with.length > 0) && (
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-500">share</span>
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Compartido con</p>
                     <p className="font-medium text-blue-600 dark:text-blue-400">
                       {event.shared_with.includes('family') 
                          ? 'Grupo Familiar' 
                          : `${event.shared_with.length} miembro${event.shared_with.length > 1 ? 's' : ''}`
                       }
                     </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 text-slate-700 dark:text-slate-200">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-slate-500">description</span>
                </div>
                <div>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Notas</p>
                   <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                     {event.notes || 'No hay notas adicionales para este evento.'}
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-12 flex flex-col gap-4 pb-6">
          <div className="flex gap-4">
          {isEditing ? (
            <>
              <button 
                onClick={() => isNew ? navigate(-1) : setIsEditing(false)}
                className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-4 px-6 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSaving && <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                Guardar
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Editar
                  </button>
              )}
              
              {event.meetingUrl ? (
                <button 
                  onClick={handleJoin}
                  disabled={hasJoined || event.status === EVENT_STATUS.CANCELLED || event.status === EVENT_STATUS.OVERDUE}
                  className={`flex-1 py-4 px-6 font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    hasJoined 
                      ? 'bg-green-500 text-white shadow-green-500/25 cursor-default' 
                      : (event.status === EVENT_STATUS.CANCELLED || event.status === EVENT_STATUS.OVERDUE)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                        : 'bg-primary text-white hover:bg-primary/90 shadow-primary/25'
                  }`}
                >
                  {hasJoined ? (
                    <>
                      <span className="material-symbols-outlined text-xl">check</span>
                      Unido
                    </>
                  ) : event.status === EVENT_STATUS.OVERDUE ? (
                    <>
                      <span className="material-symbols-outlined text-xl">event_busy</span>
                      Reunión finalizada
                    </>
                  ) : (
                    'Unirse a la reunión'
                  )}
                </button>
              ) : (
                 canEdit && (
                 <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-4 px-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? <span className="size-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></span> : <span className="material-symbols-outlined">delete</span>}
                  Eliminar
                </button>
                )
              )}
            </>
          )}
          </div>
          
          {/* Extra delete button if meeting url exists (since layout is 2 columns) */}
          {!isEditing && event.meetingUrl && canEdit && (
             <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full py-4 px-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? <span className="size-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></span> : <span className="material-symbols-outlined">delete</span>}
              Eliminar Evento
            </button>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Compartir Evento</h3>
               <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
               <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined">group</span>
                     </div>
                     <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">Todo el Grupo Familiar</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Visible para todos los miembros</p>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={shareWithFamily}
                          onChange={(e) => setShareWithFamily(e.target.checked)} 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                     </label>
                  </div>
               </div>

               <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">Miembros Específicos</p>
               
               <div className="space-y-2">
                 {familyMembers.length > 0 ? (
                   familyMembers.map(member => (
                     <div 
                       key={member.id} 
                       onClick={() => !shareWithFamily && toggleShareMember(member.id)}
                       className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                         shareWithFamily 
                           ? 'opacity-50 pointer-events-none border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                           : selectedShareMembers.includes(member.id)
                             ? 'border-primary bg-primary/5 dark:bg-primary/10'
                             : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                       }`}
                     >
                       <div className="relative">
                         <span className="material-symbols-outlined text-2xl text-slate-400">
                           {member.avatar_url || 'account_circle'}
                         </span>
                         {shareWithFamily && (
                           <span className="absolute -bottom-1 -right-1 size-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                             <span className="material-symbols-outlined text-[10px] text-white">check</span>
                           </span>
                         )}
                       </div>
                       <div className="flex-1">
                         <p className="font-medium text-slate-900 dark:text-white">{member.full_name}</p>
                         <p className="text-xs text-slate-500">{member.email}</p>
                       </div>
                       
                       {!shareWithFamily && (
                         <div className={`size-6 rounded-full border flex items-center justify-center transition-colors ${
                           selectedShareMembers.includes(member.id)
                             ? 'bg-primary border-primary text-white'
                             : 'border-slate-300 dark:border-slate-600'
                         }`}>
                           {selectedShareMembers.includes(member.id) && <span className="material-symbols-outlined text-sm">check</span>}
                         </div>
                       )}
                     </div>
                   ))
                 ) : (
                   <p className="text-sm text-slate-400 italic text-center py-4">No tienes miembros familiares agregados.</p>
                 )}
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
               <button 
                 onClick={() => setShareModalOpen(false)}
                 className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleShareSave}
                 className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
               >
                 Guardar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventPage;
