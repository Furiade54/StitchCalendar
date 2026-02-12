import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Calendar from '../components/Calendar';
import Schedule from '../components/Schedule';
import FloatingActionButton from '../components/FloatingActionButton';
import Sidebar from '../components/Sidebar';
import EventListModal from '../components/EventListModal';
import NotificationsModal from '../components/NotificationsModal';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

function CalendarPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await dataService.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleRespondNotification = async (notificationId, accept) => {
    try {
      await dataService.respondToFamilyRequest(notificationId, user.id, accept);
      // Refresh notifications
      loadNotifications();
      // If accepted, we might want to refresh user data or context, but usually that happens on next load or via context update.
      // For now, just refreshing notifications is enough to remove it from the list.
    } catch (error) {
      console.error("Error responding to notification:", error);
    }
  };

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

  const [selectedMemberId, setSelectedMemberId] = useState(user?.id);

  // Update selectedMemberId if user changes (e.g. initial load)
  useEffect(() => {
    if (user && !selectedMemberId) {
      setSelectedMemberId(user.id);
    }
  }, [user]);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('calendarState', JSON.stringify({
      selectedDay,
      currentDate: currentDate.toISOString()
    }));
  }, [selectedDay, currentDate]);

  const currentUserId = selectedMemberId || user?.id;
  
  // Check permission: Owner OR Authorized Editor
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setCanEdit(false);
        return;
      }
      if (currentUserId === user.id) {
        setCanEdit(true);
        return;
      }
      try {
        const permitted = await dataService.canEdit(currentUserId, user.id);
        setCanEdit(permitted);
      } catch (err) {
        console.error("Error checking edit permissions:", err);
        setCanEdit(false);
      }
    };
    
    checkPermission();
  }, [currentUserId, user]);

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

  const scheduleRef = useRef(null);

  useEffect(() => {
    if (selectedDay && scheduleRef.current) {
      scheduleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDay]);

  const handleEventSelect = (event) => {
    // Navigate to event details page
    // Pass the event's owner ID (event.user_id) to ensure we can find the event 
    // even if it is shared (not owned by the current viewer)
    navigate(`/event/${event.id}`, {
      state: { userId: event.user_id || currentUserId }
    });
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
    // Pass current selection state via URL params or state if needed
    navigate('/event/new', { 
      state: { 
        selectedDay,
        currentDate: currentDate.toISOString(),
        userId: currentUserId
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

      <Header 
        currentDate={currentDate} 
        onMenuClick={() => setIsMenuOpen(true)}
        selectedMemberId={selectedMemberId}
        onMemberSelect={setSelectedMemberId}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        notificationCount={notifications.length}
      />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative" id="calendar-container">
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
        <div ref={scheduleRef}>
          <Schedule 
            selectedDay={selectedDay} 
            currentDate={currentDate}
            onEventSelect={handleEventSelect}
            userId={currentUserId}
            onClearSelection={() => setSelectedDay(null)}
          />
        </div>
        <div className="h-8"></div>
      </div>
      
      {canEdit && <FloatingActionButton onClick={handleCreateEvent} />}

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
        onCreateEvent={canEdit ? handleCreateEvent : null}
      />

      <NotificationsModal 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onRespond={handleRespondNotification}
      />
    </div>
  )
}

export default CalendarPage;
