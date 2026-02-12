
import { USERS } from '../data/mockData';
import { supabase } from '../lib/supabase';

const USERS_KEY = 'stitch_users';
const SESSION_KEY = 'stitch_session';

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
  getSession: async () => {
    try {
      if (supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
           // Fetch public profile to get the most up-to-date info
           // Add timeout to profile fetch to prevent hanging
           let profileData = null;
           try {
             const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
             
             const timeoutPromise = new Promise((_, reject) => 
               setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
             );

             const result = await Promise.race([profilePromise, timeoutPromise]);
             if (result.data) {
               profileData = result.data;
             }
           } catch (err) {
             console.warn('Could not fetch public profile (timeout or error), using metadata fallback:', err);
           }
            
           // If profile fetch fails (e.g. no connection), fall back to metadata
           // But if it succeeds, merge it.
           const user = session.user;
           
           // Prioritize profile data over metadata
           const full_name = profileData?.full_name || user.user_metadata?.full_name;
           const username = profileData?.username || user.user_metadata?.username || user.email?.split('@')[0];
           const avatar_url = profileData?.avatar_url || user.user_metadata?.avatar_url;

           const profile = {
             ...user,
             // Map fields to top level
             full_name,
             username,
             avatar_url,
             // Ensure these exist
             id: user.id,
             email: user.email
           };
           
           return { ...session, user: profile };
        }
        return null;
      }

      // Fallback to Mock
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (!storedSession) return null;
      
      const session = JSON.parse(storedSession);
      const users = getStoredUsers();
      const foundUser = users.find(u => u.id === session.user.id);
      
      if (foundUser) {
        return { ...session, user: foundUser };
      }
      return null;
    } catch (e) {
      console.error('Error getting session:', e);
      return null;
    }
  },

  onAuthStateChange: (callback) => {
    if (supabase) {
      return supabase.auth.onAuthStateChange(callback);
    }
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  signIn: async (identifier, password) => {
    if (supabase) {
      // Add timeout to prevent UI freezing
      const signInPromise = supabase.auth.signInWithPassword({ 
        email: identifier, 
        password 
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('La solicitud de inicio de sesión ha excedido el tiempo de espera. Verifica tu conexión.')), 10000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
      
      if (error) throw error;
      return data;
    }

    // Fallback to Mock
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

          const updatedUser = { ...foundUser, last_seen_at: new Date().toISOString() };
          const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
          saveUsers(updatedUsers);

          const newSession = {
            access_token: 'mock_token_' + Math.random().toString(36).substr(2),
            user: updatedUser,
            expires_at: Date.now() + 3600 * 1000 
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
    if (supabase) {
      // 1. Sign Up Auth User
      const signUpPromise = supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            username: userData.email.split('@')[0], // Default username
            avatar_url: userData.avatar_url || 'account_circle'
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('La solicitud de registro ha excedido el tiempo de espera. Verifica tu conexión.')), 15000)
      );

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);

      if (error) throw error;
      
      // Note: Triggers in Supabase (handle_new_user) should automatically create the public.profile
      // If trigger fails or is missing, we might need to insert manually here, but let's rely on trigger first.
      
      return data;
    }

    // Fallback to Mock
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getStoredUsers();
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

        users.push(newUser);
        saveUsers(users);

        const newSession = {
          access_token: 'mock_token_' + Math.random().toString(36).substr(2),
          user: newUser,
          expires_at: Date.now() + 3600 * 1000
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        resolve({ user: newUser, session: newSession });
      }, 800);
    });
  },

  updateUser: async (userId, updates, currentPassword = null) => {
    if (supabase) {
       // Update Auth Metadata
       const authUpdates = {};
       if (updates.email) authUpdates.email = updates.email;
       if (updates.password) authUpdates.password = updates.password;
       if (updates.full_name || updates.avatar_url || updates.username) {
         authUpdates.data = {};
         if (updates.full_name) authUpdates.data.full_name = updates.full_name;
         if (updates.username) authUpdates.data.username = updates.username;
         if (updates.avatar_url) authUpdates.data.avatar_url = updates.avatar_url;
       }

       let updatedUser = null;

       if (Object.keys(authUpdates).length > 0) {
         const { data, error } = await supabase.auth.updateUser(authUpdates);
         if (error) throw error;
         updatedUser = data.user;
       }
       
       // Update Public Profile Table
       const profileUpdates = {};
       if (updates.full_name) profileUpdates.full_name = updates.full_name;
       if (updates.username) profileUpdates.username = updates.username;
       if (updates.avatar_url) profileUpdates.avatar_url = updates.avatar_url;
       if (updates.website) profileUpdates.website = updates.website;

       if (Object.keys(profileUpdates).length > 0) {
           const { data: profileData, error: profileError } = await supabase
               .from('profiles')
               .upsert({ id: userId, ...profileUpdates })
               .select()
               .single();

           if (profileError) {
               console.error('Error updating public profile:', profileError);
               // We don't throw here if auth update succeeded, but we should warn
           }
           
           // If we have profile data, merge it into the returned user object
           if (profileData && updatedUser) {
               updatedUser = {
                   ...updatedUser,
                   ...profileData, // Overwrite with public profile data
                   full_name: profileData.full_name || updatedUser.user_metadata?.full_name,
                   username: profileData.username || updatedUser.user_metadata?.username
               };
           }
       }

       // If we didn't update auth but updated profile (unlikely in current UI but possible), return current session user with new profile
       if (!updatedUser) {
           const { data: { session } } = await supabase.auth.getSession();
           if (session?.user) {
               // Re-fetch or manually merge
               // For simplicity, let's just return what getSession would return
               const { user } = await authService.getSession();
               return user;
           }
       }

       return updatedUser;
    }

    // Fallback to Mock
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getStoredUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            reject(new Error('Usuario no encontrado'));
            return;
        }

        const user = users[userIndex];

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
        
        users[userIndex] = updatedUser;
        saveUsers(users);
        
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
    // Always clear local storage keys first to ensure UI updates immediately
    localStorage.removeItem(SESSION_KEY);
    
    if (supabase) {
      try {
        // Attempt to sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Error signing out from Supabase:', error.message);
        }
      } catch (e) {
        // If network fails (e.g. ERR_ABORTED), we still want the user to be logged out locally
        console.warn('Network error during sign out:', e);
      }
      return;
    }

    // Fallback to Mock
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 300);
    });
  }
};
