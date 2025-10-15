/**
 * Upload file to Cloudinary via API route
 * @param file - The file to upload
 * @param folder - The folder name in Cloudinary (e.g., 'products', 'avatars')
 * @param resourceType - The resource type ('image', 'video', or 'auto')
 * @returns Object containing the URL and any error
 */
export const uploadFile = async (
  file: File,
  folder: string = 'only2u',
  resourceType: string = 'auto'
): Promise<{ url: string; error: string | null; public_id?: string }> => {
  try {
    // Validate file size (max 10MB for images, 100MB for videos)
    const maxSize = file.type.startsWith('video/') 
      ? 100 * 1024 * 1024 
      : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return {
        url: '',
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
      };
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        error: 'Invalid file type. Only JPEG, PNG, WebP, GIF images and MP4, WebM, OGG, MOV videos are allowed.'
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('resourceType', resourceType);

    // Upload to Cloudinary via API route
    const response = await fetch('/api/upload/cloudinary', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Upload error:', result.error);
      return {
        url: '',
        error: result.error || 'Failed to upload file'
      };
    }

    return {
      url: result.url,
      public_id: result.public_id,
      error: null
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      url: '',
      error: error.message || 'Failed to upload file'
    };
  }
};

/**
 * Delete file from Cloudinary via API route
 * @param public_id - The Cloudinary public ID of the file
 * @param resourceType - The resource type ('image' or 'video')
 * @returns Object containing any error
 */
export const deleteFile = async (
  public_id: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ error: string | null }> => {
  try {
    const response = await fetch('/api/upload/cloudinary', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id, resource_type: resourceType }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Delete error:', result.error);
      return { error: result.error || 'Failed to delete file' };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { error: error.message || 'Failed to delete file' };
  }
}; 