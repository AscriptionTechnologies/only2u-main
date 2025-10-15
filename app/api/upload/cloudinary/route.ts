import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'only2u';
    const resourceType = formData.get('resourceType') as string || 'auto';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB for images, 100MB for videos)
    const maxSize = file.type.startsWith('video/') 
      ? 100 * 1024 * 1024 
      : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type. Only JPEG, PNG, WebP, GIF images and MP4, WebM, OGG, MOV videos are allowed.' 
        },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Determine resource type
    let uploadResourceType: 'image' | 'video' | 'auto' = 'auto';
    if (resourceType === 'image' || file.type.startsWith('image/')) {
      uploadResourceType = 'image';
    } else if (resourceType === 'video' || file.type.startsWith('video/')) {
      uploadResourceType = 'video';
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: uploadResourceType,
      transformation: uploadResourceType === 'image' 
        ? [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
          ]
        : uploadResourceType === 'video'
        ? [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
          ]
        : undefined,
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      resource_type: uploadResponse.resource_type,
      format: uploadResponse.format,
      width: uploadResponse.width,
      height: uploadResponse.height,
      size: uploadResponse.bytes,
    });

  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload file to Cloudinary' 
      },
      { status: 500 }
    );
  }
}

// Optional: DELETE endpoint to remove files from Cloudinary
export async function DELETE(request: NextRequest) {
  try {
    const { public_id, resource_type } = await request.json();

    if (!public_id) {
      return NextResponse.json(
        { error: 'No public_id provided' },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type || 'image',
    });

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete file from Cloudinary' 
      },
      { status: 500 }
    );
  }
}

