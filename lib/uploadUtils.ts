/**
 * Upload file to Bunny (Stream for videos, Storage for images)
 * For files >4MB, uploads directly to Bunny to bypass Vercel limits
 * @param file - The file to upload
 * @param folder - Folder prefix used when saving assets
 * @param resourceType - Desired resource type ('image', 'video', or auto-detected)
 * @returns Object containing the URL and any error
 */
export const uploadFile = async (
  file: File,
  folder: string = 'only2u',
  resourceType: string = 'auto'
): Promise<{ url: string; error: string | null; public_id?: string }> => {
  try {
    // Validate file size (max 25MB for images, 500MB for videos)
    const maxSize = file.type.startsWith('video/') 
      ? 500 * 1024 * 1024 
      : 25 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return {
        url: '',
        error: `File size too large. Maximum allowed: ${maxSize / (1024 * 1024)}MB (current file: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`
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

    // For files >4MB, upload directly to Bunny to bypass Vercel's 4.5MB body limit
    const VERCEL_SAFE_SIZE = 4 * 1024 * 1024; // 4MB
    const isVideo = file.type.startsWith('video/');
    
    if (file.size > VERCEL_SAFE_SIZE) {
      // Direct upload to Bunny (client-side)
      return isVideo 
        ? await uploadVideoDirectToBunny(file, folder)
        : await uploadImageDirectToBunny(file, folder);
    }

    // For smaller files, use our API route
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('resourceType', resourceType);

    const response = await fetch('/api/upload/bunny', {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response from upload API:', text.substring(0, 200));
      
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
 * Upload video directly to Bunny Stream (bypasses Vercel)
 */
async function uploadVideoDirectToBunny(
  file: File,
  folder: string
): Promise<{ url: string; error: string | null; public_id?: string }> {
  try {
    // Get upload credentials from our API
    const credResponse = await fetch('/api/upload/bunny/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'video',
        filename: file.name,
        folder 
      }),
    });

    if (!credResponse.ok) {
      const error = await credResponse.json();
      throw new Error(error.error || 'Failed to get upload credentials');
    }

    const { libraryId, videoGuid, uploadUrl, apiKey } = await credResponse.json();

    // Upload directly to Bunny Stream
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload to Bunny Stream: ${errorText}`);
    }

    // Return HLS playlist URL for React Native video players
    // Bunny Stream URL format: https://vz-{libraryId}.b-cdn.net/{videoGuid}/playlist.m3u8
    const playbackBase = `https://vz-${libraryId}.b-cdn.net`;
    const url = `${playbackBase}/${videoGuid}/playlist.m3u8`;

    return {
      url,
      public_id: videoGuid,
      error: null,
    };
  } catch (error: any) {
    console.error('Direct video upload error:', error);
    return {
      url: '',
      error: error.message || 'Failed to upload video directly to Bunny',
    };
  }
}

/**
 * Upload image directly to Bunny Storage (bypasses Vercel)
 */
async function uploadImageDirectToBunny(
  file: File,
  folder: string
): Promise<{ url: string; error: string | null; public_id?: string }> {
  try {
    // Get upload credentials from our API
    const credResponse = await fetch('/api/upload/bunny/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'image',
        filename: file.name,
        folder 
      }),
    });

    if (!credResponse.ok) {
      const error = await credResponse.json();
      throw new Error(error.error || 'Failed to get upload credentials');
    }

    const { uploadUrl, publicUrl, objectName, apiKey } = await credResponse.json();

    // Upload directly to Bunny Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload to Bunny Storage: ${errorText}`);
    }

    return {
      url: publicUrl,
      public_id: objectName,
      error: null,
    };
  } catch (error: any) {
    console.error('Direct image upload error:', error);
    return {
      url: '',
      error: error.message || 'Failed to upload image directly to Bunny',
    };
  }
}

/**
 * Delete file from Bunny via API route
 * @param public_id - The Bunny asset identifier (storage path or video GUID)
 * @param resourceType - The resource type ('image' or 'video')
 * @returns Object containing any error
 */
export const deleteFile = async (
  public_id: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ error: string | null }> => {
  try {
    const response = await fetch('/api/upload/bunny', {
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