import React from 'react';
import ScheduleItem from './ScheduleItem';
import { useSchedule } from '../hooks/useSchedule';
import { EVENT_STATUS } from '../utils/constants';

const parseEventDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const hasT = value.includes('T');
    const normalized = hasT ? value : value.replace(' ', 'T');
    return new Date(normalized);
  }
  return new Date(value);
};

const formatTimeRange = (start, end) => {
  if (!start || !end) return null;
  const opts = { hour: '2-digit', minute: '2-digit' };
  const s = parseEventDate(start);
  const e = parseEventDate(end);
  if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const startTime = s.toLocaleTimeString([], opts);
  const endTime = e.toLocaleTimeString([], opts);
  return `${startTime} - ${endTime}`;
};

const Schedule = ({ selectedDay, currentDate, onEventSelect, refreshKey, userId, holidayNames = [], onClearSelection }) => {
  const { data: scheduleData, isLoading } = useSchedule(selectedDay, currentDate, refreshKey, userId);

  // Create a date object for the selected day to ensure correct formatting if needed,
  // but simpler to just use the month from currentDate and the selectedDay number.
  const monthName = currentDate ? currentDate.toLocaleString('es-ES', { month: 'short' }) : 'Oct';

  // Format date for item display (e.g., "Oct 12")
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Agenda</h3>
          {selectedDay && holidayNames && holidayNames.length > 0 && (
            <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              Festivo: {holidayNames.join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedDay && onClearSelection && (
             <button 
               onClick={onClearSelection}
               className="flex items-center justify-center p-1 bg-primary text-white rounded-full shadow-sm hover:bg-primary/90 transition-all"
               title="Ver todos los eventos"
             >
               <span className="material-symbols-outlined text-xs font-bold">close</span>
             </button>
          )}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
            {selectedDay ? `${monthName} ${selectedDay}` : 'Próximos eventos'}
          </span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {scheduleData.length > 0 ? (
            scheduleData.map((item) => (
              <ScheduleItem
                key={item.id}
                icon={item.icon}
                title={item.title}
                time={formatTimeRange(item.startDate, item.endDate) || item.time}
                date={formatDateForDisplay(item.startDate)}
                rawDate={item.startDate}
                showDate={!selectedDay}
                colorClass={item.colorClass}
                iconBgClass={item.iconBgClass}
                status={item.status || (item.isCompleted ? EVENT_STATUS.COMPLETED : EVENT_STATUS.SCHEDULED)}
                isImportant={item.isImportant}
                owner={item.owner}
                isShared={item.user_id !== userId}
                onClick={() => onEventSelect(item)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">event_busy</span>
              <p>{selectedDay ? 'No hay eventos para este día' : 'No hay eventos próximos'}</p>
              
              {selectedDay && onClearSelection && (
                <button 
                  onClick={onClearSelection}
                  className="mt-4 px-6 py-2 bg-primary text-white text-sm font-bold rounded-full shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                >
                  Mostrar todos los eventos
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Schedule;
