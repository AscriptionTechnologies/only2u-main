# 🎯 START HERE - Cloudinary Upload Setup

## ⚡ What You Need to Do (3 Minutes)

### Step 1: Create Cloudinary Account

**Go to:** https://cloudinary.com/users/register/free

**Sign up** (it's free!)

**You'll see this on your dashboard:**
```
Cloud Name: dxxxxx
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwxyz
```

**Copy these three values!**

---

### Step 2: Create `.env.local` File

**In your project root**, create a file named `.env.local`

**Add this (replace with YOUR values from Step 1):**

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz

NEXT_PUBLIC_SUPABASE_URL=https://ljnheixbsweamlbntwvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTg4MjksImV4cCI6MjA2NjMzNDgyOX0.a7aZsKPzKfK0UxuzP4Ihg7cR5tiR_1UrX4PTo08Ik90
```

**💡 Tip:** See `ENV_SETUP_TEMPLATE.txt` for a copy/paste template

---

### Step 3: Restart Your Server

```bash
# Stop current server (Ctrl+C or Cmd+C)

# Restart:
npm run dev
```

---

### Step 4: Test It!

1. Open your admin dashboard
2. Go to **Add Product**
3. Scroll to **"Product Media"**
4. Click the **"+"** button
5. Select an image
6. **Watch it upload automatically!** ✨

---

## ✅ That's It!

Your product uploads now use Cloudinary!

### What You Can Do Now:

✨ **Upload images** - Click "+", select, done!  
✨ **Upload videos** - Same process  
✨ **Multiple files** - Select multiple at once  
✨ **Automatic optimization** - Fast, optimized delivery  

---

## 📚 Need More Info?

### Quick Reference
- **`README_CLOUDINARY.md`** - Overview of everything
- **`CLOUDINARY_QUICKSTART.md`** - 3-minute guide

### Detailed Guides
- **`CLOUDINARY_SETUP.md`** - Complete documentation
- **`CLOUDINARY_IMPLEMENTATION_SUMMARY.md`** - What changed

---

## 🐛 Not Working?

### Common Issues:

**1. Upload button not responding?**
- Did you restart the server after adding `.env.local`?
- Check browser console (F12) for errors

**2. "Failed to upload"?**
- Double-check your Cloudinary credentials
- Make sure you copied them correctly from dashboard

**3. Still stuck?**
- Open `CLOUDINARY_SETUP.md`
- Check the Troubleshooting section
- It has solutions to common issues

---

## 🎉 Success!

Once you see files uploading automatically, you're done!

**No code changes needed** - everything works!

**Enjoy your new professional upload system!** 🚀

---

## 📝 Quick Reference

### Your Cloudinary Dashboard
https://cloudinary.com/console

### Environment Variables Needed
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  ← Your cloud name
CLOUDINARY_API_KEY                  ← Your API key
CLOUDINARY_API_SECRET               ← Your API secret
```

### File Limits
- **Images:** 10 MB max (JPEG, PNG, WebP, GIF)
- **Videos:** 100 MB max (MP4, WebM, OGG, MOV)

### Free Tier
- **25 GB** storage
- **25 GB/month** bandwidth
- **Perfect for small/medium sites!**

---

Happy uploading! 📸🎥✨

**Questions?** See the documentation files listed above.

