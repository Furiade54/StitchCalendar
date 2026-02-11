import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import CalendarPage from './pages/CalendarPage';
import EventPage from './pages/EventPage';
import SettingsPage from './pages/SettingsPage';
import EventTypesPage from './pages/EventTypesPage';
import AppearancePage from './pages/AppearancePage';
import UserProfilePage from './pages/UserProfilePage';
import CompletedTasksPage from './pages/CompletedTasksPage';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import { useAuth } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';

function App() {
  const { user, loading } = useAuth();
  useTheme();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterScreen /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <CalendarPage /> : <Navigate to="/login" />} />
        
        <Route path="/event/:id" element={user ? <EventPage /> : <Navigate to="/login" />} />
        
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
        
        <Route path="/event-types" element={user ? <EventTypesPage /> : <Navigate to="/login" />} />

        <Route path="/appearance" element={user ? <AppearancePage /> : <Navigate to="/login" />} />

        <Route path="/profile" element={user ? <UserProfilePage /> : <Navigate to="/login" />} />
        
        <Route path="/completed-tasks" element={user ? <CompletedTasksPage /> : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
