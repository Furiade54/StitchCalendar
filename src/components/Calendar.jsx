import React from 'react';
import CalendarDay from './CalendarDay';
import { WEEK_DAYS } from '../data/mockData';
import { useCalendar } from '../hooks/useCalendar';

const Calendar = ({ selectedDay, onDaySelect, currentDate, onNextMonth, onPrevMonth, onGoToToday, userId }) => {
  const { data: calendarDays, isLoading } = useCalendar(currentDate, userId);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onPrevMonth}
          className="size-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">chevron_left</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary capitalize">
            {currentDate.toLocaleString('es-ES', { month: 'long' })}
          </span>
        </div>
        <button 
          onClick={onNextMonth}
          className="size-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">chevron_right</span>
        </button>
      </div>
      {/* Weekday Labels */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="text-[11px] font-bold uppercase tracking-wider text-primary/70 dark:text-primary/70">
            {day}
          </div>
        ))}
      </div>
      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2 text-center">
        {isLoading ? (
           Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="h-14 flex items-center justify-center">
               <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
            </div>
           ))
        ) : (
          calendarDays.map((dayObj, index) => (
            <CalendarDay
              key={index}
              day={dayObj.day}
              isGhost={dayObj.isGhost}
              isSelected={!dayObj.isGhost && dayObj.day === selectedDay}
              isToday={dayObj.isToday}
              indicators={dayObj.indicators}
              onClick={() => {
                if (dayObj.isPrevMonth) {
                  onPrevMonth(dayObj.day);
                } else if (dayObj.isNextMonth) {
                  onNextMonth(dayObj.day);
                } else {
                  onDaySelect(dayObj.day);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Calendar;
