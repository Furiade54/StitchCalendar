import React from 'react';
import PropTypes from 'prop-types';
import ScheduleItem from './ScheduleItem';
import { useSchedule } from '../hooks/useSchedule';
import { EVENT_STATUS } from '../utils/constants';

const formatTimeRange = (start, end) => {
  if (!start || !end) return null;
  const options = { hour: '2-digit', minute: '2-digit' };
  const startTime = new Date(start).toLocaleTimeString([], options);
  const endTime = new Date(end).toLocaleTimeString([], options);
  return `${startTime} - ${endTime}`;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
};

const EventListModal = ({ isOpen, onClose, day, currentDate, onEventSelect, userId, onCreateEvent }) => {
  const { data: scheduleData, isLoading } = useSchedule(day, currentDate, 0, userId);

  if (!isOpen) return null;

  const monthName = currentDate ? currentDate.toLocaleString('es-ES', { month: 'long' }) : '';
  const fullDateLabel = `${day} de ${monthName}`;
  
  // Data is now already filtered by month and year in useSchedule/dataService
  const filteredEvents = scheduleData;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary/5 dark:bg-primary/10 p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-primary capitalize">{fullDateLabel}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'}
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
        <div className="overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex flex-col gap-3 animate-pulse">
               <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
               <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
            </div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((item) => (
              <ScheduleItem
                key={item.id}
                icon={item.icon}
                title={item.title}
                time={formatTimeRange(item.startDate, item.endDate) || item.time}
                date={formatDateForDisplay(item.startDate)}
                showDate={false}
                colorClass={item.colorClass}
                iconBgClass={item.iconBgClass}
                status={item.status || (item.isCompleted ? EVENT_STATUS.COMPLETED : EVENT_STATUS.SCHEDULED)}
                onClick={() => {
                  onEventSelect(item);
                  onClose();
                }}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">event_available</span>
              <p className="font-medium">Sin eventos para este día</p>
              <p className="text-xs mt-1 opacity-70">Toca el botón + para agregar uno</p>
            </div>
          )}
        </div>
        
        {/* Footer Actions (Optional) */}
        {filteredEvents.length === 0 && (
           <div className="p-4 pt-0">
              <button 
                onClick={onClose} 
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
           </div>
        )}

        {/* Floating Action Button for adding new event */}
        {onCreateEvent && (
          <button
            onClick={() => {
              onCreateEvent();
              onClose();
            }}
            className="absolute bottom-6 right-6 size-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        )}
      </div>
    </div>
  );
};

EventListModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  day: PropTypes.number,
  currentDate: PropTypes.object.isRequired,
  onEventSelect: PropTypes.func.isRequired,
  userId: PropTypes.string.isRequired,
  onCreateEvent: PropTypes.func
};

export default EventListModal;
