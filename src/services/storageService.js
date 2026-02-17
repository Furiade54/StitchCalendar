import { supabase } from '../lib/supabase';
const bucketName = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'StitchCalendar';

export const storageService = {
  uploadFile: async (file, folderPath) => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  uploadAvatar: async (file, userId) => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const path = `avatars/${userId}/${fileName}`;
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);
      return { publicUrl, path };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  extractPathFromPublicUrl: (publicUrl) => {
    try {
      if (typeof publicUrl !== 'string') return null;
      const marker = `/object/public/${bucketName}/`;
      const i = publicUrl.indexOf(marker);
      if (i === -1) return null;
      const raw = publicUrl.slice(i + marker.length);
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  },

  getPublicUrl: (path) => {
    try {
      const clean = typeof path === 'string' ? path.replace(/^\/+/, '') : path;
      const { data } = supabase.storage.from(bucketName).getPublicUrl(clean);
      return data?.publicUrl || null;
    } catch {
      return null;
    }
  },

  deleteFile: async (path) => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
};
