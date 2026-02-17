import React from 'react';
import PropTypes from 'prop-types';

const CalendarDay = ({ day, isGhost = false, isSelected = false, isToday = false, isHoliday = false, holidayNames = [], indicators = [], onClick }) => {
  if (isGhost) {
    return (
      <button 
        onClick={onClick}
        className="h-14 w-full flex flex-col items-center justify-start pt-1 opacity-30 hover:opacity-50 cursor-pointer transition-opacity"
      >
        <span className="text-sm font-medium">{day}</span>
      </button>
    );
  }

  const holidayTitle = isHoliday && holidayNames.length > 0
    ? `Festivo: ${holidayNames.join(', ')}`
    : undefined;

  return (
    <button 
      onClick={onClick}
      className="group h-14 w-full flex flex-col items-center justify-start pt-1 relative"
      title={holidayTitle}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-full text-sm transition-all duration-200
        ${isSelected 
          ? `bg-primary text-white font-semibold shadow-md shadow-primary/30 scale-110 ${isToday ? 'ring-2 ring-white dark:ring-slate-900 ring-offset-2 ring-offset-primary' : ''}`
          : isToday
            ? 'bg-primary/15 text-primary font-extrabold ring-2 ring-primary'
            : isHoliday
              ? 'bg-emerald-100 text-emerald-700 font-bold ring-2 ring-emerald-400'
              : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
        }`}
      >
        {day}
      </span>
      {indicators.length > 0 && (
        <div className="mt-1 flex gap-0.5">
          {indicators.map((color, index) => (
            <div
              key={index}
              className={`size-1 rounded-full ${color}`}
            ></div>
          ))}
        </div>
      )}
    </button>
  );
};

CalendarDay.propTypes = {
  day: PropTypes.number.isRequired,
  isGhost: PropTypes.bool,
  isSelected: PropTypes.bool,
  isToday: PropTypes.bool,
  isHoliday: PropTypes.bool,
  holidayNames: PropTypes.arrayOf(PropTypes.string),
  indicators: PropTypes.arrayOf(PropTypes.string),
  onClick: PropTypes.func,
};

export default CalendarDay;
