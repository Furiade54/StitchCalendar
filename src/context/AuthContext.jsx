import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize state from service on mount
  useEffect(() => {
    const initializeAuth = () => {
      const currentSession = authService.getSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
      setLoading(false);
    };

    initializeAuth();
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
