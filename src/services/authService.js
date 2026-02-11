import { USERS } from '../data/mockData';
// import { supabase } from '../lib/supabase'; // FUTURE: Import Supabase client

const USERS_KEY = 'stitch_users';
const SESSION_KEY = 'stitch_session';

// FUTURE: This service simulates authentication.
// To migrate to Supabase:
// 1. Replace localStorage calls with supabase.auth methods.
// 2. Remove getStoredUsers and saveUsers helpers.
// 3. See comments inside methods for specific replacements.

// Helper to access the "database" (localStorage)
const getStoredUsers = () => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : USERS;
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const authService = {
  // Check for existing session
  getSession: () => {
    try {
      // FUTURE: const { data: { session } } = await supabase.auth.getSession(); return session;
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (!storedSession) return null;
      
      const session = JSON.parse(storedSession);
      const users = getStoredUsers();
      const foundUser = users.find(u => u.id === session.user.id);
      
      if (foundUser) {
        // Return session with fresh user data
        return { ...session, user: foundUser };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  signIn: async (identifier, password) => {
    // FUTURE: const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getStoredUsers();
        const foundUser = users.find(u => u.email === identifier || u.id === identifier);
        
        if (foundUser) {
          if (foundUser.status !== 'active') {
             reject(new Error('La cuenta de usuario no está activa'));
             return;
          }

          if (foundUser.password && foundUser.password !== password) {
             reject(new Error('Contraseña incorrecta'));
             return;
          }

          // Update last_seen_at
          const updatedUser = { ...foundUser, last_seen_at: new Date().toISOString() };
          
          // Update DB
          const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
          saveUsers(updatedUsers);

          const newSession = {
            access_token: 'mock_token_' + Math.random().toString(36).substr(2),
            user: updatedUser,
            expires_at: Date.now() + 3600 * 1000 // 1 hour
          };
          
          localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
          resolve({ user: updatedUser, session: newSession });
        } else {
          reject(new Error('Usuario no encontrado'));
        }
      }, 500);
    });
  },

  signUp: async (userData) => {
    // FUTURE: const { data, error } = await supabase.auth.signUp({ email: userData.email, password: userData.password, options: { data: { full_name: userData.full_name } } });
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getStoredUsers();
        
        // Check if email already exists
        const existingUser = users.find(u => u.email === userData.email);
        if (existingUser) {
          reject(new Error('El correo electrónico ya está registrado'));
          return;
        }

        const newUser = {
          id: `user_${Date.now()}`,
          ...userData,
          username: userData.email.split('@')[0],
          avatar_url: 'account_circle',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };

        // Update DB
        users.push(newUser);
        saveUsers(users);

        // Auto login
        const newSession = {
          access_token: 'mock_token_' + Math.random().toString(36).substr(2),
          user: newUser,
          expires_at: Date.now() + 3600 * 1000 // 1 hour
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        resolve({ user: newUser, session: newSession });
      }, 800);
    });
  },

  updateUser: async (userId, updates, currentPassword = null) => {
    // FUTURE: const { data, error } = await supabase.auth.updateUser(updates);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getStoredUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            reject(new Error('Usuario no encontrado'));
            return;
        }

        const user = users[userIndex];

        // If password is being updated, verify current password
        if (updates.password) {
            if (!currentPassword) {
                reject(new Error('Se requiere la contraseña actual para establecer una nueva'));
                return;
            }
            if (currentPassword !== user.password) {
                reject(new Error('La contraseña actual es incorrecta'));
                return;
            }
        }

        const updatedUser = { 
          ...user, 
          ...updates,
          updated_at: new Date().toISOString()
        };
        
        // Update DB
        users[userIndex] = updatedUser;
        saveUsers(users);
        
        // Update session if it matches current user
        const storedSession = localStorage.getItem(SESSION_KEY);
        if (storedSession) {
            const session = JSON.parse(storedSession);
            if (session.user.id === userId) {
                const updatedSession = { ...session, user: updatedUser };
                localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
            }
        }

        resolve(updatedUser);
      }, 500);
    });
  },

  signOut: async () => {
    // FUTURE: await supabase.auth.signOut();
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem(SESSION_KEY);
        resolve();
      }, 300);
    });
  }
};