# Cloudinary Setup Guide

## Environment Variables Required

Add these environment variables to your `.env.local` file (for local development) and to your Vercel project settings (for production):

### Required Variables

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# For large video uploads (optional but recommended)
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name
```

## How to Get These Values

### 1. Cloudinary Cloud Name, API Key, and Secret

1. Log in to your [Cloudinary Dashboard](https://cloudinary.com/console)
2. On the dashboard homepage, you'll see:
   - **Cloud name** - Copy this value
   - **API Key** - Copy this value
   - **API Secret** - Click "Reveal" and copy this value

### 2. Creating an Upload Preset (For Large Videos)

For large video files (> 10MB), the app uploads directly to Cloudinary to bypass Vercel's body size limits. You need to create an unsigned upload preset:

1. Go to **Settings** → **Upload** in your Cloudinary dashboard
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: Choose a name (e.g., `only2u_uploads`)
   - **Signing Mode**: Select **Unsigned**
   - **Folder**: Leave empty or specify a base folder
   - **Resource type**: Can be set to **Auto**
   - **Access mode**: Set to **Public**
5. Click **Save**
6. Copy the preset name and use it as `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

**Important**: For security, you should configure the unsigned preset with:
- Allowed formats (mp4, webm, ogg, mov for videos; jpg, png, webp, gif for images)
- Max file size limits
- Specific folder restrictions

## Adding to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Click **Add New**
   - Enter the **Key** (e.g., `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`)
   - Enter the **Value**
   - Select environments (Production, Preview, Development)
   - Click **Save**
4. Redeploy your application for the changes to take effect

## How It Works

### Small Files (< 10MB)
- Uploaded through your Next.js API route (`/api/upload/cloudinary`)
- Server-side signed upload for better security

### Large Files (Videos > 10MB)
- Uploaded directly from the browser to Cloudinary
- Uses unsigned upload preset to bypass Vercel's body size limits
- Still secure with proper preset configuration

## Troubleshooting

### Error: "Cloudinary configuration missing"
- Make sure `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set correctly
- Verify the environment variable name has the `NEXT_PUBLIC_` prefix

### Error: "Upload preset not found"
- Verify the upload preset name is correct
- Make sure the preset is set to **Unsigned** mode
- Check that the preset exists in your Cloudinary account

### Error: "Request Entity Too Large" or "413"
- This means the file is too large for the API route
- The app should automatically use direct upload for large videos
- If you still see this error, check that `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` is set correctly

### Videos not uploading on Vercel
- Verify all environment variables are set in Vercel project settings
- Make sure to redeploy after adding environment variables
- Check Vercel function logs for detailed error messages
