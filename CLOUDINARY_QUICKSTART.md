# 🚀 Cloudinary Quick Start Guide

## Get Started in 3 Minutes!

### Step 1: Create Cloudinary Account (2 minutes)

1. Go to **[https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)**
2. Sign up for a **free account**
3. You'll be redirected to your dashboard

### Step 2: Get Your Credentials (30 seconds)

On your Cloudinary dashboard, you'll see:

```
Cloud Name: dxxxxx
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwxyz123456
```

Copy these values!

### Step 3: Add to Environment Variables (30 seconds)

Create/edit `.env.local` in your project root:

```bash
# Add these three lines:
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456

# Keep your existing Supabase config:
NEXT_PUBLIC_SUPABASE_URL=https://ljnheixbsweamlbntwvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Replace with YOUR actual credentials from step 2!**

### Step 4: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

### Step 5: Test It! (30 seconds)

1. Open your admin dashboard
2. Go to **Category Management**
3. Click on any category
4. Click **"Add Product"**
5. Scroll to **"Product Media"** section
6. Click the **"+"** button under Images
7. Select an image file
8. Watch it upload automatically! ✨

---

## That's It! 🎉

Your product uploads now use Cloudinary instead of manual URL pasting!

### What You Can Do Now:

✅ **Upload images** - Click "+", select files, done!  
✅ **Upload videos** - Same process, just select video files  
✅ **Multiple files** - Select multiple files at once  
✅ **Shared media** - Upload once, apply to all variants  
✅ **Variant-specific** - Upload different images per size/color  

---

## Example `.env.local` File

Here's what your complete `.env.local` should look like:

```env
# Cloudinary Configuration (NEW - Required for uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxy123456
CLOUDINARY_API_KEY=987654321098765
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrSt123456

# Supabase Configuration (EXISTING - Keep these)
NEXT_PUBLIC_SUPABASE_URL=https://ljnheixbsweamlbntwvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Troubleshooting

### Upload not working?

**Check 1:** Did you restart the dev server after adding environment variables?
```bash
# Stop server and restart
npm run dev
```

**Check 2:** Are your credentials correct?
- Log in to Cloudinary dashboard
- Copy credentials again (they might be different)
- Update `.env.local`
- Restart server

**Check 3:** Open browser console (F12) and check for errors

### Need more help?

See the full guide: `CLOUDINARY_SETUP.md`

---

## File Limits

- **Images:** Max 10 MB (JPEG, PNG, WebP, GIF)
- **Videos:** Max 100 MB (MP4, WebM, OGG, MOV)

Files are automatically optimized and compressed!

---

## Free Tier Limits

Cloudinary free plan includes:

- ✅ 25 GB storage
- ✅ 25 GB/month bandwidth
- ✅ 25,000 transformations/month
- ✅ Unlimited uploads

**Perfect for most small to medium e-commerce sites!**

---

That's all you need to know to get started! 🚀

For advanced features, see `CLOUDINARY_SETUP.md`

