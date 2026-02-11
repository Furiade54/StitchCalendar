import React from 'react';
import PropTypes from 'prop-types';
import { EVENT_STATUS } from '../data/mockData';

const ScheduleItem = ({ icon, title, time, date, rawDate, showDate, colorClass, iconBgClass, status, isImportant, owner, isShared, onClick }) => {
  const isCompleted = status === EVENT_STATUS.COMPLETED;
  const isCancelled = status === EVENT_STATUS.CANCELLED;
  
  // UX Logic for time-based styling
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = rawDate ? new Date(rawDate) : null;
  if (eventDate) eventDate.setHours(0, 0, 0, 0);

  const isPast = eventDate && eventDate < today;
  const isToday = eventDate && eventDate.getTime() === today.getTime();
  const isFuture = eventDate && eventDate > today;

  // Overrides for specific statuses if needed, but time-based takes precedence for general look
  // Past events: Grayed out (opacity + grayscale)
  // Today events: Greenish tone/accent
  // Future events: Default blue/primary accent
  
  // Base classes
  let containerClasses = "flex items-center gap-4 p-3 rounded-2xl border shadow-sm hover:scale-[1.01] transition-transform cursor-pointer ";
  let iconContainerClasses = `flex size-12 shrink-0 items-center justify-center rounded-xl `;
  let titleClasses = "text-base font-semibold truncate ";
  let timeClasses = "text-sm flex items-center gap-1 ";
  let statusIconClasses = "material-symbols-outlined ";

  // Apply styles based on state
  if (isCompleted || isCancelled) {
    // Keep existing logic for completed/cancelled as priority
    containerClasses += "bg-white dark:bg-surface-dark opacity-60 border-slate-200 dark:border-transparent";
    iconContainerClasses += `${iconBgClass} ${colorClass}`;
    titleClasses += "text-slate-500 line-through";
    timeClasses += "text-slate-500 dark:text-slate-400";
    statusIconClasses += isCompleted ? "text-green-500" : "text-red-500";
  } else if (isPast) {
    // Past events (active but old) -> Gray look
    containerClasses += "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800";
    iconContainerClasses += "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"; // Gray icon
    titleClasses += "text-slate-500 dark:text-slate-400";
    timeClasses += "text-slate-400 dark:text-slate-500";
    statusIconClasses += "text-slate-400"; // Gray chevron
  } else if (isToday) {
    // Today events -> Green accent
    containerClasses += "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800";
    iconContainerClasses += "bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300";
    titleClasses += "text-slate-900 dark:text-white";
    timeClasses += "text-emerald-600 dark:text-emerald-400 font-medium";
    statusIconClasses += "text-emerald-500";
  } else {
    // Future events -> Default (Blue/Primary)
    containerClasses += "bg-white dark:bg-surface-dark border-slate-200 dark:border-transparent";
    iconContainerClasses += `${iconBgClass} ${colorClass}`;
    titleClasses += "text-slate-900 dark:text-white";
    timeClasses += "text-slate-500 dark:text-slate-400";
    statusIconClasses += "text-slate-400 dark:text-slate-600";
  }

  // Overdue override
  // Only apply warning border if it's NOT a past event (keep past events subtle/gray)
  // or if we want to highlight overdue tasks specifically. 
  // For now, removing the orange border for past events to maintain the "inactive" gray look requested by user.
  if (status === EVENT_STATUS.OVERDUE && !isCompleted && !isCancelled) {
     if (!isPast) {
        containerClasses += " border-orange-500/50";
     }
     // Keep the icon orange to indicate action needed, or make it subtle?
     // User asked for "gray" for past events. Let's make the icon subtle too if it's past.
     statusIconClasses = isPast 
        ? "material-symbols-outlined text-orange-400/70" // Subtle orange for past
        : "material-symbols-outlined text-orange-500"; 
  }

  return (
    <div 
      onClick={onClick}
      className={containerClasses}
    >
      <div className={`${iconContainerClasses} relative`}>
        <span className={`material-symbols-outlined ${isCompleted ? 'filled-icon' : ''}`}>{icon}</span>
        {isImportant && (
          <div className="absolute -top-1.5 -right-1.5 bg-white dark:bg-surface-dark rounded-full size-5 flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-900/30">
             <span className="material-symbols-outlined text-amber-400 text-[14px] filled-icon">star</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={titleClasses}>
          {title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
            <p className={timeClasses}>
            {showDate && date && (
                <>
                <span className={isToday ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}>{date}</span>
                <span className="text-slate-300 mx-1">•</span>
                </>
            )}
            {time}
            </p>
            {isShared && owner && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md border border-indigo-100 dark:border-indigo-800/50">
                    <span className="material-symbols-outlined text-[10px] text-indigo-500 dark:text-indigo-400">group</span>
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 truncate max-w-[80px]">
                        {owner.full_name?.split(' ')[0] || 'Compartido'}
                    </span>
                </div>
            )}
        </div>
      </div>
      
      <span className={statusIconClasses}>
        {isCompleted ? 'check_circle' : 
         isCancelled ? 'cancel' : 
         (status === EVENT_STATUS.OVERDUE) ? 'error' : 
         'chevron_right'}
      </span>
    </div>
  );
};

ScheduleItem.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  date: PropTypes.string,
  showDate: PropTypes.bool,
  colorClass: PropTypes.string,
  iconBgClass: PropTypes.string,
  status: PropTypes.string,
  onClick: PropTypes.func,
};

ScheduleItem.defaultProps = {
  colorClass: 'text-primary',
  iconBgClass: 'bg-primary/10',
  status: EVENT_STATUS.SCHEDULED,
};

export default ScheduleItem;
