import React from 'react';
import CalendarDay from './CalendarDay';
import { WEEK_DAYS } from '../utils/constants';
import { useCalendar } from '../hooks/useCalendar';

const Calendar = ({ selectedDay, onDaySelect, currentDate, onNextMonth, onPrevMonth, onGoToToday, userId }) => {
  const { data: calendarDays, isLoading } = useCalendar(currentDate, userId);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  const yearLabel = currentDate.getFullYear();
  const visibleMonths = React.useMemo(() => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return [prev, currentDate, next];
  }, [currentDate]);

  return (
    <div className="relative px-4 pb-2">
      {/* Watermark year behind calendar */}
      <div
        className="pointer-events-none absolute inset-4 flex items-center justify-center -z-0"
        aria-hidden="true"
      >
        <span
          className="select-none text-[140px] font-extrabold text-sky-500/5 dark:text-sky-400/5"
          style={{ transform: 'rotate(-45deg)' }}
        >
          {yearLabel}
        </span>
      </div>

      <div className="relative z-10 flex items-center justify-between mb-4 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md rounded-2xl px-2 py-1">
        <button 
          onClick={onPrevMonth}
          className="size-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">chevron_left</span>
        </button>
        <div className="flex items-center gap-4 min-w-40 justify-center" key={`months-${monthKey}`}>
          {visibleMonths.map((d, idx) => {
            const isActive = idx === 1;
            return (
              <span
                key={`${monthKey}-${idx}`}
                className={`text-sm font-bold capitalize transition-all duration-300
                  ${isActive ? 'text-primary opacity-100' : 'text-slate-400 opacity-50'}`}
              >
                {d.toLocaleString('es-ES', { month: 'long' })}
              </span>
            );
          })}
        </div>
        <button 
          onClick={onNextMonth}
          className="size-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">chevron_right</span>
        </button>
      </div>
      {/* Weekday Labels */}
      <div key={`${monthKey}-labels`} className="relative z-10 grid grid-cols-7 mb-2 text-center animate-in fade-in duration-300">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="text-[11px] font-bold uppercase tracking-wider text-primary/70 dark:text-primary/70">
            {day}
          </div>
        ))}
      </div>
      {/* Days Grid */}
      <div key={`${monthKey}-grid`} className="relative z-10 grid grid-cols-7 gap-y-2 text-center animate-in fade-in duration-300">
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
              isHoliday={dayObj.isHoliday}
              holidayNames={dayObj.holidayNames}
              indicators={dayObj.indicators}
              onClick={() => {
                if (dayObj.isPrevMonth) {
                  onPrevMonth(dayObj.day);
                } else if (dayObj.isNextMonth) {
                  onNextMonth(dayObj.day);
                } else {
                  onDaySelect(dayObj);
                }
              }}
            />
          ))
        )}
      </div>
      {/* Subtle top fade to focus header area */}
      <div className="pointer-events-none absolute left-0 right-0 top-[76px] h-6 bg-gradient-to-b from-white/85 dark:from-surface-dark/80 to-transparent"></div>
    </div>
  );
};

export default Calendar;
