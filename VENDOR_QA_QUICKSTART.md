# 🚀 Vendor Q&A - Quick Start Guide

## What Is This?

A **Q&A management system** where:
- 📱 **Customers** ask questions about products
- 💼 **Vendors** answer questions
- 👨‍💼 **Super Admin** (you) views and moderates everything

---

## ⚡ Quick Setup (2 Minutes)

### Step 1: Run Database Migration

1. Open **Supabase Dashboard**
2. Go to **SQL Editor** → **New Query**
3. Copy and paste from:
   ```
   migrations/003_create_vendor_qa_system.sql
   ```
4. Click **Run**

**✅ Creates:** Q&A tables, triggers, indexes

### Step 2: Access Q&A Page

1. Open your **admin dashboard**
2. Look in **sidebar** → **"Vendor Q&A"** (new menu item!)
3. Click to open
4. You'll see the Q&A management page

**✅ That's it! Setup complete!**

---

## 🎯 What You Can Do

### View All Q&A
- See **all questions** from customers
- See **all answers** from vendors
- **Search** across everything
- **Filter** by status or visibility

### Moderate Content
- **Hide** inappropriate questions/answers
- **Approve/Unapprove** content
- **Delete** spam or violations
- **Track** unanswered questions

### Monitor Activity
- **Statistics** - Total, unanswered, answered
- **Search** - Find specific Q&A quickly
- **Filter** - Focus on what matters
- **Details** - View full Q&A threads

---

## 🎨 UI Overview

### Main Dashboard

```
┌────────────────────────────────────────┐
│  Vendor Q&A Management                 │
│  156 questions • 23 unanswered         │
├────────────────────────────────────────┤
│  [Search...] [Status▼] [Visibility▼]  │
├────────────────────────────────────────┤
│  📊 Total: 156  ⏳ Unanswered: 23     │
│  ✅ Answered: 133  👁️ Visible: 142    │
├────────────────────────────────────────┤
│  Product  Customer  Question  Actions  │
│  ───────────────────────────────────── │
│  T-Shirt  John      What's...  👁️✅🗑️  │
│  Jeans    Sarah     Size?...   👁️✅🗑️  │
└────────────────────────────────────────┘
```

### Actions

- **👁️ View** - See full details
- **👁‍🗨 Hide/Show** - Toggle visibility
- **✅ Approve** - Toggle approval
- **🗑️ Delete** - Remove permanently

---

## 📋 Common Admin Tasks

### Task 1: Review Unanswered Questions

```
1. Open Vendor Q&A page
2. Filter: Status → "Unanswered"
3. See all pending questions
4. Contact vendors to respond
```

### Task 2: Hide Inappropriate Content

```
1. Find problematic question/answer
2. Click hide button (eye icon)
3. Content hidden from public
4. Still visible to you for records
```

### Task 3: Delete Spam

```
1. Find spam question
2. Click delete button
3. Confirm deletion
4. Question and all answers removed
```

### Task 4: Monitor Vendor Performance

```
1. Filter: Status → "Unanswered"
2. Group by vendor (manual review)
3. Identify slow responders
4. Follow up with vendors
```

---

## 📱 For Mobile App Developers

### Create Question (Customer)

```typescript
await fetch('/api/qa/create-question', {
  method: 'POST',
  body: JSON.stringify({
    product_id: productId,
    vendor_id: vendorId, // optional
    customer_id: customerId,
    question_text: "What's the material?"
  })
});
```

### Create Answer (Vendor)

```typescript
await fetch('/api/qa/create-answer', {
  method: 'POST',
  body: JSON.stringify({
    question_id: questionId,
    vendor_id: vendorId,
    answer_text: "100% cotton"
  })
});
```

### Display Q&A (Product Page)

```typescript
const { data: questions } = await supabase
  .from('vendor_questions')
  .select(`
    *,
    customer:customer_id(name),
    answers:vendor_answers(
      *,
      vendor:vendor_id(name)
    )
  `)
  .eq('product_id', productId)
  .eq('is_visible', true)
  .eq('is_approved', true);

// Display in UI
```

**Complete code:** See `VENDOR_QA_FEATURE.md` → Mobile App Integration

---

## 🔍 Search & Filter Examples

### Search Examples

- "size" - Finds all Q&A about sizing
- "john" - Finds questions/answers by John
- "material" - Finds material-related Q&A
- "vendor@email.com" - Finds specific vendor's activity

### Filter Combinations

**Unanswered + Visible:**
- Shows questions waiting for answers
- That are currently public

**Answered + Hidden:**
- Shows answered Q&A that you've hidden
- Useful for reviewing moderation decisions

---

## 💡 Use Cases

### Use Case 1: Product Information Hub
```
Customers ask common questions
   ↓
Vendors provide detailed answers
   ↓
Admin ensures quality
   ↓
New customers see helpful Q&A
   ↓
Reduces customer support load
```

### Use Case 2: Quality Control
```
Customer asks question
   ↓
Vendor gives poor/incorrect answer
   ↓
Admin spots in dashboard
   ↓
Admin hides answer, contacts vendor
   ↓
Vendor provides better answer
   ↓
Admin makes it visible
```

### Use Case 3: Spam Prevention
```
Spammer posts irrelevant question
   ↓
Admin sees in dashboard
   ↓
Admin deletes immediately
   ↓
Clean Q&A experience maintained
```

---

## 📊 Statistics You Can Track

### Available Metrics

- **Total questions** - All-time count
- **Unanswered** - Need vendor attention
- **Answered** - Questions with responses
- **Visible** - Currently shown to public
- **Hidden** - Moderated content

### Performance Insights

- **Response rate** - % of questions answered
- **Response time** - How fast vendors answer
- **Active vendors** - Who answers most
- **Popular products** - Most questions per product

---

## 🎯 Best Practices

### Daily Tasks

1. ✅ Check "Unanswered" filter
2. ✅ Review new questions (past 24 hours)
3. ✅ Monitor for spam/inappropriate content
4. ✅ Encourage vendors to respond

### Weekly Tasks

1. ✅ Review hidden content (decide to delete)
2. ✅ Analyze most-asked-about products
3. ✅ Check vendor response rates
4. ✅ Update moderation policies if needed

---

## 🐛 Troubleshooting

### Q&A page not in sidebar

**Solution:** Refresh browser, clear cache

### No questions showing

**Solution:** 
1. Check migration ran successfully
2. Add test question via SQL
3. Refresh page

### Can't toggle visibility

**Solution:**
1. Check browser console for errors
2. Verify Supabase connection
3. Check user has admin role

---

## 📞 Quick Reference

### Database Tables
- `vendor_questions` - All questions
- `vendor_answers` - All answers

### API Endpoints
- `POST /api/qa/create-question` - Create question
- `POST /api/qa/create-answer` - Create answer

### Admin Page
- **Location:** Sidebar → Vendor Q&A
- **Features:** View, Search, Filter, Moderate

### Documentation
- **Quick:** `VENDOR_QA_QUICKSTART.md` (this file)
- **Complete:** `VENDOR_QA_FEATURE.md`

---

## ✅ Summary

### What You Get

✨ **Complete Q&A system**  
✨ **Full moderation tools**  
✨ **Professional dashboard**  
✨ **Easy mobile integration**  
✨ **Search & filtering**  

### Setup Time

⏱️ **2 minutes** (run migration + check page)

### Mobile Integration

📱 **2 API endpoints** (create question, create answer)

### Ready to Use

✅ **Admin panel** - Ready now!  
✅ **API endpoints** - Ready for mobile app  
✅ **Documentation** - Complete guides  

---

## 🚀 Next Steps

1. **Run migration** (Step 1 above)
2. **Check sidebar** for "Vendor Q&A"
3. **Integrate mobile app** (see `VENDOR_QA_FEATURE.md`)
4. **Test the flow** end-to-end

---

Happy moderating! 💬✨

For detailed mobile app integration, see `VENDOR_QA_FEATURE.md`

