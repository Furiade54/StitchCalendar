import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { useFeedback } from './FeedbackContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const { showAlert } = useFeedback();

  // Initialize state from service on mount
  useEffect(() => {
    let mounted = true;

    const subscription = { unsubscribe: () => {} };

    // Also call getSession once to handle the initial state in case onAuthStateChange doesn't fire immediately
    // or for the very first load. BUT, onAuthStateChange with 'INITIAL_SESSION' (if supported by client) 
    // or just the initial subscription often catches it. 
    // Supabase v2: getSession() is still good for initial server-side/local check, 
    // but onAuthStateChange handles the async refresh.
    
    const initializeAuth = async () => {
      try {
        const currentSession = await authService.getSession();
        if (mounted) {
          if (currentSession) {
             setSession(currentSession);
             setUser(currentSession.user);
             try {
               await dataService.ensureDefaultEventTypes(currentSession.user.id);
             } catch (seedErr) {
               console.warn('Seed event types failed (init):', seedErr?.message || seedErr);
             }
          }
        }
      } catch (error) {
        console.error('Error initializing auth (initial check):', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // SAFETY TIMEOUT: Prevent infinite spinner; uses ref to avoid stale closure
    const safetyTimeout = setTimeout(() => {
        if (mounted && loadingRef.current) {
            console.warn("AuthContext: Force stopping loading spinner after 5s safety timeout.");
            showAlert(
              'La autenticación está tardando demasiado. Verifica tu conexión y el acceso a la base de datos.',
              'Tiempo de espera de autenticación',
              'warning'
            );
            setLoading(false);
        }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const signIn = async (identifier, password) => {
    try {
      const sessionData = await authService.signIn(identifier, password);
      setUser(sessionData.user);
      setSession(sessionData);
      try {
        await dataService.ensureDefaultEventTypes(sessionData.user.id);
      } catch (seedErr) {
        console.warn('Seed event types failed (signIn):', seedErr?.message || seedErr);
      }
      return sessionData;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    await authService.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const updateUser = async (updates, currentPassword = null) => {
    if (!user) return;
    try {
      const updatedUser = await authService.updateUser(user.id, updates, currentPassword);
      setUser(updatedUser);
      // Update session state as well
      if (session) {
        setSession({ ...session, user: updatedUser });
      }
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (userData) => {
    try {
      const sessionData = await authService.signUp(userData);
      setUser(sessionData.user);
      setSession(sessionData);
      try {
        await dataService.ensureDefaultEventTypes(sessionData.user.id);
      } catch (seedErr) {
        console.warn('Seed event types failed (signUp):', seedErr?.message || seedErr);
      }
      return sessionData;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    updateUser,
    signUp
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
