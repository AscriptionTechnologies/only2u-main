# Cloudinary Image & Video Upload Setup Guide

## Overview

Your admin dashboard now uses **Cloudinary** for uploading product images and videos instead of manually pasting URLs. This provides:

✅ **Automatic uploads** - Just select files, no need to copy/paste URLs  
✅ **Image optimization** - Automatic compression and format conversion  
✅ **Video support** - Upload product videos directly  
✅ **CDN delivery** - Fast global content delivery  
✅ **Transformations** - Automatic resizing and quality optimization  

---

## Prerequisites

You need a Cloudinary account (free tier available):

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. After signup, you'll see your dashboard with credentials

---

## Step 1: Get Your Cloudinary Credentials

1. **Log in to Cloudinary Dashboard**: https://cloudinary.com/console
2. You'll see your credentials on the main dashboard:
   - **Cloud Name** (e.g., `dxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

---

## Step 2: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# Cloudinary Configuration (Required for product image/video uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here

# Existing Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ljnheixbsweamlbntwvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Example `.env.local` file:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxyze12345
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
NEXT_PUBLIC_SUPABASE_URL=https://ljnheixbsweamlbntwvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Important Notes:

- **Never commit `.env.local`** to git (it's already in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes variables available in the browser
- Keep `API_SECRET` secure - it should NOT have the `NEXT_PUBLIC_` prefix

---

## Step 3: Restart Your Development Server

After adding environment variables, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Step 4: Test the Upload Functionality

1. **Navigate to Add Product Page**
   - Go to Category Management
   - Select a category
   - Click "Add Product"

2. **Upload Images**
   - Scroll to "Product Media" section
   - Click the "+" button in the Images area
   - Select one or multiple images
   - Files will automatically upload to Cloudinary

3. **Upload Videos**
   - Click the "+" button in the Videos area
   - Select video files
   - Videos will automatically upload to Cloudinary

4. **Per-Variant Uploads**
   - After configuring variants (color/size combinations)
   - Each variant row has image and video upload buttons
   - Upload variant-specific media directly

---

## How It Works

### Upload Flow

```
User selects file
      ↓
Frontend validates file (type, size)
      ↓
File sent to /api/upload/cloudinary
      ↓
Backend uploads to Cloudinary
      ↓
Cloudinary returns secure URL
      ↓
URL stored in product data
      ↓
Image/Video displayed in product
```

### File Validations

**Images:**
- Allowed formats: JPEG, PNG, WebP, GIF
- Maximum size: 10 MB
- Auto-optimized to max 1200x1200px
- Automatic format conversion (WebP for supported browsers)
- Quality optimization

**Videos:**
- Allowed formats: MP4, WebM, OGG, MOV
- Maximum size: 100 MB
- Auto-optimized to max 1920x1080px
- Quality optimization

---

## Cloudinary Folders Structure

Uploads are organized in folders:

```
only2u/
├── products/          # Product variant images
├── productvideos/     # Product variant videos
├── avatars/           # User profile images
├── profiles/          # Additional profile images
└── reviews/           # Review profile images
```

You can view and manage these in your Cloudinary Media Library.

---

## Features

### 1. **Shared Media (Upload Once, Use Everywhere)**

In the ProductForm, you can upload images/videos once and apply them to all variants:

- Upload shared media at the top of the form
- Click "Apply shared media to all variants"
- Media is added to every size/color combination

### 2. **Variant-Specific Media**

Each variant (e.g., "Red - Medium") has its own upload buttons:

- Upload unique images for specific variants
- Upload videos for product demonstrations
- Remove individual media items

### 3. **Automatic Optimization**

Cloudinary automatically:
- Compresses images without quality loss
- Converts to optimal formats (WebP, AVIF)
- Resizes to appropriate dimensions
- Lazy loads images for better performance
- Delivers via global CDN

### 4. **Multiple File Upload**

- Select multiple files at once
- All files upload sequentially
- Progress indication during upload
- Error handling for failed uploads

---

## Troubleshooting

### Issue: "Failed to upload file to Cloudinary"

**Solutions:**

1. **Check environment variables**
   ```bash
   # Verify your .env.local file has all three variables
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

2. **Restart dev server**
   ```bash
   # Kill the server and restart
   npm run dev
   ```

3. **Verify Cloudinary credentials**
   - Log in to Cloudinary dashboard
   - Check that your credentials are correct
   - Ensure API access is enabled

### Issue: "File size too large"

**Solution:** 
- Images: Maximum 10 MB
- Videos: Maximum 100 MB
- Compress files before uploading if they exceed limits

### Issue: "Invalid file type"

**Solution:**
- Images: Use JPEG, PNG, WebP, or GIF
- Videos: Use MP4, WebM, OGG, or MOV
- Convert unsupported formats online (e.g., using CloudConvert)

### Issue: Upload button not responding

**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Check network tab for failed requests
4. Ensure Cloudinary credentials are correct

### Issue: Images not displaying after upload

**Solution:**
1. Check browser console for CORS errors
2. Verify Cloudinary URL is accessible
3. Check that media was saved in variant data
4. Try hard refresh (Ctrl+Shift+R)

---

## Security Best Practices

### ✅ Do's

- ✅ Keep `CLOUDINARY_API_SECRET` secure and private
- ✅ Use environment variables for all credentials
- ✅ Never commit `.env.local` to git
- ✅ Regularly rotate your API credentials
- ✅ Use Cloudinary's upload presets for better security
- ✅ Monitor your Cloudinary usage dashboard

### ❌ Don'ts

- ❌ Don't expose API secret in client-side code
- ❌ Don't hardcode credentials in source files
- ❌ Don't share credentials in public repositories
- ❌ Don't use the same credentials across multiple projects

---

## Cloudinary Dashboard Features

Access your Cloudinary dashboard for advanced features:

### Media Library
- View all uploaded images and videos
- Organize files into folders
- Bulk operations (delete, move, rename)
- Search and filter media

### Transformations
- Resize images on-the-fly
- Apply filters and effects
- Add watermarks
- Crop and rotate

### Analytics
- View upload statistics
- Monitor bandwidth usage
- Track transformations
- View most popular assets

### Settings
- Configure upload presets
- Set up transformations
- Manage API credentials
- Configure security settings

---

## API Endpoints

### Upload Endpoint

```typescript
POST /api/upload/cloudinary

Body (FormData):
- file: File
- folder: string (optional, default: "only2u")
- resourceType: string (optional, "image" | "video" | "auto")

Response:
{
  success: true,
  url: string,           // Secure Cloudinary URL
  public_id: string,     // Cloudinary public ID
  resource_type: string, // "image" or "video"
  format: string,        // File format (jpg, png, mp4, etc.)
  width: number,         // Asset width
  height: number,        // Asset height
  size: number          // File size in bytes
}
```

### Delete Endpoint (Optional)

```typescript
DELETE /api/upload/cloudinary

Body (JSON):
{
  public_id: string,
  resource_type: "image" | "video"
}

Response:
{
  success: true,
  result: object // Cloudinary deletion result
}
```

---

## Migration from URL-based Uploads

If you have existing products with pasted URLs:

1. **Old products still work** - Existing URL-based images/videos continue to display
2. **New uploads use Cloudinary** - All new uploads automatically go to Cloudinary
3. **No migration needed** - Mixed approach is supported
4. **Optional: Re-upload** - You can re-upload old images to Cloudinary for consistency

---

## Cost & Limits

### Cloudinary Free Tier

- ✅ 25 GB storage
- ✅ 25 GB monthly bandwidth
- ✅ 25,000 transformations/month
- ✅ Unlimited uploads
- ✅ Global CDN

**This is usually sufficient for small to medium e-commerce sites.**

### Monitoring Usage

1. Go to: https://cloudinary.com/console
2. Check "Usage" section
3. Monitor:
   - Storage usage
   - Bandwidth consumption
   - Transformations count

### Upgrading

If you exceed free tier limits:
- Cloudinary will notify you
- You can upgrade to a paid plan
- Plans start at $99/month for more resources

---

## Advanced Configuration

### Custom Upload Presets

Create upload presets in Cloudinary dashboard for:
- Custom transformations
- Automatic tagging
- Folder organization
- Access control

### Transformations on Upload

Modify `app/api/upload/cloudinary/route.ts` to add transformations:

```typescript
transformation: [
  { width: 800, height: 800, crop: 'fill' },
  { quality: 'auto:best' },
  { fetch_format: 'auto' }
]
```

### Webhook Integration

Set up webhooks in Cloudinary for:
- Upload notifications
- Transformation completion
- Deletion events

---

## Support

### Cloudinary Documentation
- Main Docs: https://cloudinary.com/documentation
- Upload API: https://cloudinary.com/documentation/upload_images
- Video Uploads: https://cloudinary.com/documentation/upload_videos
- Transformations: https://cloudinary.com/documentation/image_transformations

### Getting Help
1. Check Cloudinary documentation
2. Visit Cloudinary support: https://support.cloudinary.com
3. Community forum: https://community.cloudinary.com

---

## Summary Checklist

Before going live, ensure:

- [ ] Cloudinary account created
- [ ] Environment variables configured in `.env.local`
- [ ] Development server restarted
- [ ] Test upload of images (works ✓)
- [ ] Test upload of videos (works ✓)
- [ ] Product saves successfully with Cloudinary URLs
- [ ] Images display correctly in product listings
- [ ] Videos play correctly
- [ ] File size limits are appropriate
- [ ] Cloudinary usage is monitored

---

## What Changed

### Before (Supabase Storage)
```typescript
uploadFile(file, 'productsimages', 'products')
// Uploaded to: Supabase Storage bucket
```

### After (Cloudinary)
```typescript
uploadFile(file, 'products', 'image')
// Uploaded to: Cloudinary folder
```

The function signature changed slightly:
- Old: `(file, bucket, path)`
- New: `(file, folder, resourceType)`

**All existing code in ProductForm continues to work!**

---

Happy uploading! 🚀📸🎥

If you have any questions or run into issues, refer to this guide or check the Cloudinary documentation.

