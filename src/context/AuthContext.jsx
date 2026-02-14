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
    let mounted = true;

    // Listen for auth changes FIRST - this is the source of truth
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log(`[AuthContext] Auth State Change: ${event}`, session?.user?.id);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        // Only fetch profile if we have a valid session
        try {
           // We reuse getSession logic which merges profile data, 
           // but we should pass the session we already have to avoid double-fetching if possible,
           // or just rely on getSession to be safe and get fresh profile data.
           // However, to avoid race conditions with token refresh, we should trust the session from the event
           // IF it's newer. But getSession is safer for profile hydration.
           
           const currentSession = await authService.getSession();
           if (mounted && currentSession) {
             setSession(currentSession);
             setUser(currentSession.user);
           } else if (mounted) {
             // Fallback if getSession fails but event had session (rare)
             setSession(session);
             setUser(session.user);
           }
        } catch (err) {
            console.error("Error hydrating profile on auth change:", err);
        } finally {
            if (mounted) setLoading(false);
        }
      } else if (event === 'INITIAL_SESSION' && !session) {
          // No session found on startup
          if (mounted) {
              setSession(null);
              setUser(null);
              setLoading(false);
          }
      }
    });

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
          }
        }
      } catch (error) {
        console.error('Error initializing auth (initial check):', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // SAFETY TIMEOUT: Force loading to false after 5 seconds to prevent infinite spinner
    const safetyTimeout = setTimeout(() => {
        if (mounted && loading) {
            console.warn("AuthContext: Force stopping loading spinner after 5s safety timeout.");
            setLoading(false);
        }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
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
