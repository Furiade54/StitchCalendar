import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useFeedback } from './FeedbackContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useFeedback();

  // Initialize state from service on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Add a timeout race to prevent eternal loading
        // Increased to 8s to be more forgiving on slow connections
        const sessionPromise = authService.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 8000)
        );

        const currentSession = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Notify user about connection issues
        if (error.message === 'Session fetch timeout') {
           showAlert(
             'La conexión con el servidor está tardando demasiado. Es posible que experimentes lentitud o necesites recargar la página.', 
             'Conexión Lenta', 
             'warning'
           );
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // We might need to fetch the full profile again if it's not in the session user metadata
        // For simplicity, let's just rely on what getSession logic does, or reuse it.
        // But getSession logic merges profile data.
        // We can just call getSession again to be sure, or trust the session user if metadata is enough.
        // Given our profile logic, let's just set the session as is, but maybe we miss profile updates?
        // Actually, calling getSession is safer to get the profile data merged.
        const currentSession = await authService.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier, password) => {
    try {
      const { user, session } = await authService.signIn(identifier, password);
      setUser(user);
      setSession(session);
      return { user, session };
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
      const { user, session } = await authService.signUp(userData);
      setUser(user);
      setSession(session);
      return { user, session };
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
