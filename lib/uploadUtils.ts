import { supabase } from './supabase';

export const uploadFile = async (
  file: File,
  bucket: string,
  path: string
): Promise<{ url: string; error: string | null }> => {
  try {
    // Validate file size (max 10MB for images, 100MB for videos)
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        url: '',
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
      };
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        error: 'Invalid file type. Only JPEG, PNG, WebP images and MP4, WebM, OGG videos are allowed.'
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${path}/${fileName}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        url: '',
        error: error.message
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      error: null
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      url: '',
      error: 'Failed to upload file'
    };
  }
};

export const deleteFile = async (
  bucket: string,
  path: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Delete error:', error);
    return { error: 'Failed to delete file' };
  }
}; 