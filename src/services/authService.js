
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'stitch_session'; // Keeping this if we need to clear legacy session data

export const authService = {
  // Check for existing session
  getSession: async () => {
    try {
      if (!supabase) throw new Error('Supabase not initialized');

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
          
         // SELF-HEALING: If profile is missing but user is authenticated, create it.
         if (!profileData && session.user) {
             console.warn("User profile missing during session check. Attempting self-healing creation...");
             const user = session.user;
             const newProfile = {
                 id: user.id,
                 email: user.email,
                 full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                 avatar_url: user.user_metadata?.avatar_url,
                 username: user.user_metadata?.username || user.email?.split('@')[0],
                 status: 'active'
             };
             
             try {
                 const { error: createError } = await supabase
                    .from('profiles')
                    .insert(newProfile);
                    
                 if (!createError) {
                     console.log("Profile created successfully via self-healing.");
                     profileData = newProfile;
                 } else {
                     console.error("Self-healing failed:", createError);
                 }
             } catch (healErr) {
                 console.error("Self-healing exception:", healErr);
             }
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
    } catch (e) {
      console.error('Error getting session:', e);
      return null;
    }
  },

  onAuthStateChange: (callback) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },

  signIn: async (identifier, password) => {
    if (!supabase) throw new Error('Supabase not initialized');

    // Add timeout to prevent UI freezing
    const signInPromise = supabase.auth.signInWithPassword({ 
      email: identifier, 
      password 
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('La solicitud ha excedido el tiempo de espera. Verifica tu conexión y que las credenciales de Supabase sean correctas.')), 10000)
    );

    const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
    
    if (error) throw error;

    return data;
  },

  signUp: async (userData) => {
    if (!supabase) throw new Error('Supabase not initialized');

    try {
      // 1. Sign Up Auth User
      const { data, error } = await supabase.auth.signUp({
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

      if (error) throw error;
      
      // Note: Triggers in Supabase (handle_new_user) should automatically create the public.profile
      // If trigger fails or is missing, we might need to insert manually here, but let's rely on trigger first.
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (userId, updates, currentPassword = null) => {
    if (!supabase) throw new Error('Supabase not initialized');

    // Check for active session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('No active session found. Please log in again.');
    }

    // Verify userId matches session
    if (session.user.id !== userId) {
      throw new Error('Unauthorized: Cannot update another user profile.');
    }

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
  }
};
