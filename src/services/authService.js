
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'app_session';

const readSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.user.id) return parsed;
    return null;
  } catch {
    return null;
  }
};

const writeSession = (user) => {
  const session = { user };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const authService = {
  getSession: async () => {
    const stored = readSession();
    if (!stored || !stored.user || !stored.user.id) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', stored.user.id)
        .maybeSingle();
      if (error || !data) {
        return stored;
      }
      const session = writeSession(data);
      return session;
    } catch {
      return stored;
    }
  },

  signIn: async (identifier, password) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', identifier)
      .eq('password', password)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Usuario no encontrado');
    const session = writeSession(data);
    return session;
  },

  signUp: async (userData) => {
    const newUser = {
      id: undefined,
      email: userData.email,
      full_name: userData.full_name,
      avatar_url: userData.avatar_url || 'account_circle',
      username: userData.email.split('@')[0],
      password: userData.password,
      country: userData.country || null,
      status: 'active'
    };
    const { data, error } = await supabase
      .from('profiles')
      .insert(newUser)
      .select('*')
      .single();
    if (error) throw error;
    const session = writeSession(data);
    return session;
  },

  updateUser: async (userId, updates) => {
    let currentAllowed = [];
    if (updates.allowed_editors) {
      const { data: current } = await supabase
        .from('profiles')
        .select('allowed_editors')
        .eq('id', userId)
        .maybeSingle();
      currentAllowed = Array.isArray(current?.allowed_editors) ? current.allowed_editors : [];
    }
    const dbUpdates = {};
    if (updates.full_name) dbUpdates.full_name = updates.full_name;
    if (updates.username) dbUpdates.username = updates.username;
    if (updates.avatar_url) dbUpdates.avatar_url = updates.avatar_url;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.password) dbUpdates.password = updates.password;
    if (Object.prototype.hasOwnProperty.call(updates, 'country')) dbUpdates.country = updates.country;
    if (updates.allowed_editors) dbUpdates.allowed_editors = updates.allowed_editors;
    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw error;
    if (updates.allowed_editors) {
      const nextAllowed = Array.isArray(updates.allowed_editors) ? updates.allowed_editors : [];
      const granted = nextAllowed.filter(id => !currentAllowed.includes(id));
      const revoked = currentAllowed.filter(id => !nextAllowed.includes(id));
      const notifInsert = [];
      granted.forEach(id => {
        notifInsert.push({
          type: 'editor_grant',
          from_user_id: userId,
          to_user_id: id,
          status: 'granted',
          payload: { owner_id: userId }
        });
      });
      revoked.forEach(id => {
        notifInsert.push({
          type: 'editor_revoke',
          from_user_id: userId,
          to_user_id: id,
          status: 'revoked',
          payload: { owner_id: userId }
        });
      });
      if (notifInsert.length > 0) {
        await supabase.from('notifications').insert(notifInsert);
      }
    }
    writeSession(data);
    return data;
  },

  signOut: async () => {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
};
