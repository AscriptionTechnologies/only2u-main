/**
 * Upload file to Cloudinary via API route or direct upload
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

    // For videos larger than 5MB, upload directly to Cloudinary
    // This bypasses Vercel's body size limits (Vercel has ~4.5MB limit)
    const isLargeVideo = file.type.startsWith('video/') && file.size > 5 * 1024 * 1024;
    
    if (isLargeVideo) {
      // Direct upload to Cloudinary (unsigned upload)
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
      
      if (!cloudName) {
        return {
          url: '',
          error: 'Cloudinary configuration missing'
        };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);
      
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
      
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Direct Cloudinary upload error:', error);
        return {
          url: '',
          error: 'Failed to upload video directly to Cloudinary'
        };
      }

      const result = await response.json();
      
      return {
        url: result.secure_url,
        public_id: result.public_id,
        error: null
      };
    }

    // For smaller files, use our API route
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('resourceType', resourceType);

    // Upload to Cloudinary via API route
    const response = await fetch('/api/upload/cloudinary', {
      method: 'POST',
      body: formData,
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // If not JSON, it's likely an error page or text response
      const text = await response.text();
      console.error('Non-JSON response from upload API:', text.substring(0, 200));
      
      // Check for common error patterns
      if (text.includes('Request Entity Too Large') || text.includes('413')) {
        return {
          url: '',
          error: 'File size too large for upload. Please try a smaller file or compress the video.'
        };
      }
      
      return {
        url: '',
        error: 'Upload failed: Server returned an invalid response. Please check your file size and format.'
      };
    }

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