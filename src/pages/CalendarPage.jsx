import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Calendar from '../components/Calendar';
import Schedule from '../components/Schedule';
import FloatingActionButton from '../components/FloatingActionButton';
import Sidebar from '../components/Sidebar';
import EventListModal from '../components/EventListModal';
import { useAuth } from '../context/AuthContext';

function CalendarPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Initialize state from sessionStorage if available to preserve context on back navigation
  const [selectedDay, setSelectedDay] = useState(() => {
    const saved = sessionStorage.getItem('calendarState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.selectedDay;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [currentDate, setCurrentDate] = useState(() => {
    const saved = sessionStorage.getItem('calendarState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.currentDate ? new Date(parsed.currentDate) : new Date();
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  });

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('calendarState', JSON.stringify({
      selectedDay,
      currentDate: currentDate.toISOString()
    }));
  }, [selectedDay, currentDate]);

  const currentUserId = user.id;

  const handlePrevMonth = (arg) => {
    // If arg is a number (day), use it; otherwise (e.g. event object), treat as null
    const dayToSelect = typeof arg === 'number' ? arg : null;
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(dayToSelect);
  };

  const handleNextMonth = (arg) => {
    // If arg is a number (day), use it; otherwise (e.g. event object), treat as null
    const dayToSelect = typeof arg === 'number' ? arg : null;
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(dayToSelect);
  };

  const handleEventSelect = (event) => {
    // Navigate to event details page
    navigate(`/event/${event.id}`);
  };

  const handleDaySelect = (day) => {
    if (selectedDay === day) {
      // Second tap on already selected day -> Open Events Modal
      setIsEventModalOpen(true);
    } else {
      setSelectedDay(day);
    }
  };

  const handleCreateEvent = () => {
    // Navigate to create event page
    // Pass current selection state via URL params or state if needed, 
    // but for now let's just use query params or assume defaults in the new page
    // We can pass state in navigate
    navigate('/event/new', { 
      state: { 
        selectedDay,
        currentDate: currentDate.toISOString() 
      } 
    });
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
    setIsMenuOpen(false);
  };

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-hidden shadow-2xl mx-auto">
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onGoToToday={handleGoToToday}
        onLogout={signOut}
      />
      
      <div className="bg-white dark:bg-surface-dark px-6 pt-4 flex justify-between items-center">
        <div className="text-xs font-bold text-primary uppercase tracking-wider">
          Stitch Calendar
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            title="Mi Perfil"
            className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
             <span className="material-symbols-outlined text-xl">{user.avatar_url}</span>
          </button>
        </div>
      </div>

      <Header 
        currentDate={currentDate} 
        onMenuClick={() => setIsMenuOpen(true)}
      />
      
      <div className="flex-1 overflow-y-auto pb-24">
        <Calendar 
            selectedDay={selectedDay}
            onDaySelect={handleDaySelect}
            currentDate={currentDate}
            onNextMonth={handleNextMonth}
            onPrevMonth={handlePrevMonth}
            onGoToToday={handleGoToToday}
            userId={currentUserId}
          />
        <div className="h-px bg-slate-200 dark:bg-slate-800 mx-4 mb-4"></div>
        <Schedule 
          selectedDay={selectedDay} 
          currentDate={currentDate}
          onEventSelect={handleEventSelect}
          userId={currentUserId}
          onClearSelection={() => setSelectedDay(null)}
        />
        <div className="h-8"></div>
      </div>

      <FloatingActionButton onClick={handleCreateEvent} />

      {!isCurrentMonth && (
        <div className="fixed bottom-6 left-6 z-50">
          <button 
            onClick={handleGoToToday}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-white dark:bg-slate-800 text-primary shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all border border-slate-100 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-xl">calendar_today</span>
            <span className="font-bold text-sm">Hoy</span>
          </button>
        </div>
      )}

      {/* Event List Modal */}
      <EventListModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        day={selectedDay}
        currentDate={currentDate}
        onEventSelect={handleEventSelect}
        userId={currentUserId}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  )
}

export default CalendarPage;
