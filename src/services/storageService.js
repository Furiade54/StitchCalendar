import { supabase } from '../lib/supabase';
const bucketName = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'StitchCalendar';

export const storageService = {
  uploadFile: async (file, folderPath) => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { data, error } = await supabase.storage
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
