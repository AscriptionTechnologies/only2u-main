# Vendor Q&A Management System

## Overview

A comprehensive Q&A system where customers can ask questions about products, vendors can answer them, and super admins can view, moderate, and manage all questions and answers in one centralized dashboard.

---

## 🎯 Feature Description

### What It Does

✅ **Customers** ask questions about products  
✅ **Vendors** answer customer questions  
✅ **Super Admin** views and moderates all Q&A  
✅ **Visibility control** - Hide inappropriate content  
✅ **Approval workflow** - Approve/unapprove questions & answers  
✅ **Complete management** - Edit, delete, filter, search  

---

## 🚀 Quick Setup

### Step 1: Run Database Migration

Open **Supabase SQL Editor** and run:

```sql
-- migrations/003_create_vendor_qa_system.sql
```

This creates:
- `vendor_questions` table
- `vendor_answers` table
- Indexes for performance
- Auto-update triggers
- Auto-answered marking triggers

### Step 2: Verify Tables

Check in Supabase Table Editor:
- ✅ `vendor_questions` exists
- ✅ `vendor_answers` exists

### Step 3: Access Q&A Page

1. Open your admin dashboard
2. Look in sidebar → **"Vendor Q&A"** (new!)
3. Click to open
4. Initially empty (no Q&A yet)

✅ **Setup complete!**

---

## 🎨 Admin Panel UI

### Vendor Q&A Page

**Location:** Sidebar → Vendor Q&A

**Features:**
- **Statistics Cards** - Total, Unanswered, Answered, Visible
- **Search Bar** - Search questions, answers, products, users
- **Filters** - Status (all/answered/unanswered), Visibility (all/visible/hidden)
- **Q&A Table** - All questions with answers
- **Actions** - View, Show/Hide, Approve/Unapprove, Delete

### Statistics Dashboard

```
┌─────────────┬──────────────┬─────────────┬──────────────┐
│ Total Q's   │ Unanswered   │ Answered    │ Visible      │
│    156      │     23       │    133      │    142       │
└─────────────┴──────────────┴─────────────┴──────────────┘
```

### Q&A Table

| Product | Customer | Question | Vendor | Status | Answers | Date | Actions |
|---------|----------|----------|--------|--------|---------|------|---------|
| T-Shirt | John | What's the material? | Vendor A | Answered | 1 | Oct 15 | 👁️👁‍🗨✅🗑️ |
| Jeans | Sarah | Size runs large? | Vendor B | Pending | 0 | Oct 14 | 👁️👁‍🗨✅🗑️ |

### Actions Per Question

- **👁️ View** - Open detailed modal
- **👁‍🗨 Show/Hide** - Toggle visibility
- **✅ Approve/Unapprove** - Toggle approval status
- **🗑️ Delete** - Remove question (and all answers)

---

## 📊 Database Schema

### `vendor_questions` Table

```sql
id                UUID (PK)
product_id        UUID (FK → products) [optional]
vendor_id         UUID (FK → users) [optional]
customer_id       UUID (FK → users) [required]
question_text     TEXT [required]
is_answered       BOOLEAN (default: false)
is_approved       BOOLEAN (default: true)
is_visible        BOOLEAN (default: true)
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### `vendor_answers` Table

```sql
id                UUID (PK)
question_id       UUID (FK → vendor_questions) [required]
vendor_id         UUID (FK → users) [required]
answer_text       TEXT [required]
is_approved       BOOLEAN (default: true)
is_visible        BOOLEAN (default: true)
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Relationships

```
users (customers)
    ↓ (customer_id)
vendor_questions
    ↓ (question_id)
vendor_answers
    ↓ (vendor_id)
users (vendors)
```

---

## 🔄 Workflow

### Customer Asks Question (Mobile App)

```
1. Customer views product
2. Clicks "Ask a Question"
3. Types question
4. Submits
   ↓
Question appears in:
- Product page (for other customers)
- Vendor dashboard (for vendor to answer)
- Super Admin Q&A page (for moderation)
```

### Vendor Answers Question (Vendor App/Panel)

```
1. Vendor sees unanswered questions
2. Clicks question to answer
3. Types answer
4. Submits
   ↓
Answer appears in:
- Product page (below question)
- Customer notification
- Super Admin Q&A page
```

### Admin Moderates (Admin Panel)

```
1. Opens Vendor Q&A page
2. Reviews questions and answers
3. Can:
   - Hide inappropriate content
   - Unapprove spam
   - Delete violations
   - Search and filter
```

---

## 📱 Mobile App Integration

### API Endpoints

#### Create Question

**POST** `/api/qa/create-question`

```typescript
const response = await fetch(`${API_URL}/api/qa/create-question`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: productId, // optional
    vendor_id: vendorId, // optional
    customer_id: customerId,
    question_text: "What material is this made of?"
  })
});

// Response
{
  "success": true,
  "question": { /* question object */ },
  "message": "Question created successfully"
}
```

#### Create Answer

**POST** `/api/qa/create-answer`

```typescript
const response = await fetch(`${API_URL}/api/qa/create-answer`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question_id: questionId,
    vendor_id: vendorId,
    answer_text: "It's made of 100% cotton"
  })
});

// Response
{
  "success": true,
  "answer": { /* answer object */ },
  "message": "Answer created successfully"
}
```

### Mobile App Example (React Native)

```typescript
// ProductDetailsScreen.tsx

const [questions, setQuestions] = useState([]);
const [showAskQuestion, setShowAskQuestion] = useState(false);
const [questionText, setQuestionText] = useState('');

// Fetch questions for this product
useEffect(() => {
  fetchProductQuestions();
}, [productId]);

async function fetchProductQuestions() {
  const { data, error } = await supabase
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
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (!error) {
    setQuestions(data || []);
  }
}

// Ask question function
async function askQuestion() {
  if (!questionText.trim()) return;

  try {
    const response = await fetch(`${API_URL}/api/qa/create-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        vendor_id: product.vendor_id,
        customer_id: currentUser.id,
        question_text: questionText
      })
    });

    const result = await response.json();

    if (result.success) {
      Alert.alert('Success', 'Your question has been submitted!');
      setQuestionText('');
      setShowAskQuestion(false);
      fetchProductQuestions(); // Refresh
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to submit question');
  }
}

// Render Q&A section in product page
return (
  <ScrollView>
    {/* Product details... */}

    {/* Q&A Section */}
    <View style={styles.qaSection}>
      <View style={styles.qaSectionHeader}>
        <Text style={styles.qaTitle}>Questions & Answers</Text>
        <TouchableOpacity 
          style={styles.askButton}
          onPress={() => setShowAskQuestion(true)}
        >
          <Text style={styles.askButtonText}>Ask a Question</Text>
        </TouchableOpacity>
      </View>

      {/* Questions List */}
      {questions.map(q => (
        <View key={q.id} style={styles.questionCard}>
          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>Q</Text>
            <View style={styles.questionContent}>
              <Text style={styles.customerName}>{q.customer?.name}</Text>
              <Text style={styles.questionText}>{q.question_text}</Text>
              <Text style={styles.questionDate}>
                {new Date(q.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Answers */}
          {q.answers?.map(a => (
            <View key={a.id} style={styles.answerContainer}>
              <Text style={styles.answerLabel}>A</Text>
              <View style={styles.answerContent}>
                <Text style={styles.vendorName}>{a.vendor?.name} (Vendor)</Text>
                <Text style={styles.answerText}>{a.answer_text}</Text>
                <Text style={styles.answerDate}>
                  {new Date(a.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}

      {questions.length === 0 && (
        <Text style={styles.noQuestions}>
          No questions yet. Be the first to ask!
        </Text>
      )}
    </View>

    {/* Ask Question Modal */}
    <Modal visible={showAskQuestion} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Ask a Question</Text>
        <TextInput
          style={styles.questionInput}
          placeholder="Type your question here..."
          value={questionText}
          onChangeText={setQuestionText}
          multiline
          numberOfLines={4}
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setShowAskQuestion(false);
              setQuestionText('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={askQuestion}
          >
            <Text style={styles.submitButtonText}>Submit Question</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </ScrollView>
);
```

---

## 🎯 Admin Features

### 1. **Statistics Dashboard**

Shows at a glance:
- Total questions
- Unanswered questions (need attention)
- Answered questions
- Visible questions

### 2. **Search Functionality**

Search across:
- Question text
- Answer text
- Product names
- Customer names
- Vendor names
- Email addresses

### 3. **Filtering**

**Status Filter:**
- All
- Answered only
- Unanswered only

**Visibility Filter:**
- All
- Visible only
- Hidden only

### 4. **Question Management**

For each question:
- **View Details** - See full Q&A thread
- **Toggle Visibility** - Show/hide from public
- **Toggle Approval** - Approve/unapprove
- **Delete** - Remove permanently (with cascade)

### 5. **Answer Management**

For each answer:
- **Toggle Visibility** - Show/hide specific answer
- **Delete** - Remove specific answer
- Auto-marks question as unanswered if last answer deleted

---

## 💡 Use Cases

### Use Case 1: Product Inquiry
```
Customer: "Is this shirt machine washable?"
   ↓
Vendor: "Yes, cold water wash recommended"
   ↓
Admin: Reviews, ensures quality, keeps visible
```

### Use Case 2: Size Questions
```
Customer: "I'm 5'10", which size should I get?"
   ↓
Vendor: "Medium would be perfect for your height"
   ↓
Admin: Verifies helpful answer, keeps visible
```

### Use Case 3: Inappropriate Content
```
Customer: [Posts spam or inappropriate question]
   ↓
Admin: Sees in Q&A dashboard
   ↓
Admin: Hides question, or deletes if severe
```

### Use Case 4: Vendor Accountability
```
Customer: "Is this genuine leather?"
   ↓
Vendor: [No answer after 3 days]
   ↓
Admin: Sees unanswered questions
   ↓
Admin: Contacts vendor to respond
```

---

## 🔧 Moderation Capabilities

### Visibility Control

**Hide a Question:**
- Question not shown to public
- Still visible to admin
- Can unhide later

**Hide an Answer:**
- Answer not shown to public
- Question still visible
- Other answers (if any) remain visible

### Approval Control

**Unapprove Question:**
- Marks as pending review
- Can be used for flagged content
- Different from hiding (tracks approval status)

**Auto-Approval:**
- New questions auto-approved by default
- Can be changed in API endpoint
- Allows moderation queue if needed

### Deletion

**Delete Question:**
- Removes question permanently
- All answers also deleted (CASCADE)
- Cannot be undone

**Delete Answer:**
- Removes specific answer
- Question remains
- Auto-updates answered status if last answer

---

## 📊 Admin Dashboard Features

### Main Table View

Displays:
- Product name (what question is about)
- Customer name and email
- Question preview (truncated)
- Vendor name (if answered)
- Status badges (Answered/Pending, Visible/Hidden)
- Answer count
- Date created
- Quick actions

### View Details Modal

Shows:
- **Question Section** (blue theme)
  - Customer info
  - Full question text
  - Approval status
  - Visibility status
  - Timestamp
  
- **Answers Section** (green theme)
  - All answers (if any)
  - Vendor info per answer
  - Full answer text
  - Approval & visibility per answer
  - Timestamps
  - Actions (hide/delete) per answer

- **Action Buttons**
  - Hide/Show question
  - Approve/Unapprove question
  - Delete question

---

## 🔄 Automatic Features

### Auto-Answered Status

Triggers automatically handle:
- When answer is added → Question marked as `is_answered = true`
- When last answer is deleted → Question marked as `is_answered = false`
- No manual updating needed

### Auto-Updated Timestamps

Triggers automatically:
- Update `updated_at` when question is modified
- Update `updated_at` when answer is modified

---

## 📱 Mobile App Features to Implement

### Customer Features

1. **Ask Question Button**
   - On product details page
   - Modal/screen to type question
   - Submit to API

2. **View Q&A**
   - Display all questions for product
   - Show answers below each question
   - Filter to show only visible & approved

3. **Track My Questions**
   - In user profile
   - Show all questions asked by user
   - Show answer status

### Vendor Features

1. **Unanswered Questions Dashboard**
   - List all unanswered questions
   - Filter by vendor's products
   - Quick answer interface

2. **Answer Interface**
   - Text input for answer
   - Submit to API
   - See answer appear immediately

3. **Answer History**
   - View all questions answered
   - Edit answers (if needed)
   - Track response rate

---

## 🔔 Notifications (Recommended)

### Customer Notifications

Send when:
- Vendor answers their question
- Admin moderates their content

### Vendor Notifications

Send when:
- New question about their product
- Admin moderates their answer

### Implementation Example

```typescript
// Listen for new answers to user's questions
supabase
  .channel('qa_updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'vendor_answers',
    },
    async (payload) => {
      // Fetch question to check if it belongs to current user
      const { data: question } = await supabase
        .from('vendor_questions')
        .select('customer_id, question_text, product_id')
        .eq('id', payload.new.question_id)
        .single();

      if (question && question.customer_id === currentUser.id) {
        // Send notification
        sendPushNotification({
          title: 'Your Question Was Answered!',
          body: 'A vendor answered your question about a product.',
          data: { questionId: payload.new.question_id }
        });
      }
    }
  )
  .subscribe();
```

---

## 🎓 Best Practices

### For Admins

✅ **Monitor regularly** - Check for spam or inappropriate content  
✅ **Quick moderation** - Hide offensive content immediately  
✅ **Track unanswered** - Encourage vendors to respond  
✅ **Quality control** - Ensure answers are helpful  
✅ **Use filters** - Focus on pending items first  

### For Mobile App Integration

✅ **Show only visible** - Filter `is_visible = true`  
✅ **Show only approved** - Filter `is_approved = true`  
✅ **Sort by helpful** - Consider upvote system  
✅ **Real-time updates** - Use Supabase subscriptions  
✅ **Moderate before display** - Option for pre-approval  

---

## 🧪 Testing Guide

### Test Scenario 1: Create Question

**Mobile App (or via SQL):**
```sql
INSERT INTO vendor_questions (
  product_id,
  customer_id,
  question_text
) VALUES (
  'product-uuid',
  'customer-user-uuid',
  'What is the return policy?'
);
```

**Admin Panel:**
1. Go to Vendor Q&A
2. Should see new question
3. Status should be "Pending" (unanswered)
4. ✅ Success if visible

### Test Scenario 2: Add Answer

**SQL:**
```sql
INSERT INTO vendor_answers (
  question_id,
  vendor_id,
  answer_text
) VALUES (
  'question-uuid',
  'vendor-user-uuid',
  '30-day return policy on all items'
);
```

**Admin Panel:**
1. Refresh Vendor Q&A page
2. Question status should change to "Answered"
3. Answer count should show "1"
4. Click "View" to see answer
5. ✅ Success if answer visible

### Test Scenario 3: Hide Question

**Admin Panel:**
1. Find a question
2. Click hide button (eye icon)
3. Status should update to "Hidden"
4. ✅ Success if status changes

### Test Scenario 4: Delete Question

**Admin Panel:**
1. Click delete button
2. Confirm deletion
3. Question should disappear
4. Check database - should be deleted
5. Check answers table - answers should also be deleted (CASCADE)
6. ✅ Success if deleted

---

## 🎨 UI Design

### Color Coding

- **Questions** - Blue theme (blue-50 background, blue borders)
- **Answers** - Green theme (green-50 background, green borders)
- **Status Badges:**
  - Answered - Green
  - Unanswered - Amber
  - Approved - Green
  - Pending - Red
  - Visible - Blue/Purple
  - Hidden - Gray

### Layout

**Question Card:**
```
┌────────────────────────────────────┐
│ Q  John Doe (john@email.com)       │
│    [Approved] [Visible]             │
│                                    │
│    What material is this made of?  │
│                                    │
│    Oct 15, 2025 10:30 AM          │
└────────────────────────────────────┘
```

**Answer Card:**
```
┌────────────────────────────────────┐
│ A  Vendor Name (vendor@email.com)  │
│    [Approved] [Visible]             │
│                                    │
│    It's made of 100% cotton with   │
│    premium quality fabric.         │
│                                    │
│    Oct 15, 2025 2:45 PM           │
│    [Hide] [Delete]                 │
└────────────────────────────────────┘
```

---

## 📊 Statistics & Analytics

### Track Metrics

**Response Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_answered) * 100.0 / COUNT(*) as response_rate
FROM vendor_questions;
```

**Average Response Time:**
```sql
SELECT 
  AVG(
    EXTRACT(EPOCH FROM (va.created_at - vq.created_at)) / 3600
  ) as avg_hours_to_respond
FROM vendor_questions vq
JOIN vendor_answers va ON vq.id = va.question_id;
```

**Most Active Vendors:**
```sql
SELECT 
  u.name,
  COUNT(*) as total_answers
FROM vendor_answers va
JOIN users u ON va.vendor_id = u.id
GROUP BY u.id, u.name
ORDER BY total_answers DESC
LIMIT 10;
```

**Most Asked About Products:**
```sql
SELECT 
  p.name,
  COUNT(*) as question_count
FROM vendor_questions vq
JOIN products p ON vq.product_id = p.id
GROUP BY p.id, p.name
ORDER BY question_count DESC
LIMIT 10;
```

---

## 🔒 Security & Privacy

### Data Protection

✅ **Email visibility** - Only admins see emails  
✅ **Moderation** - Hide before deletion  
✅ **Approval workflow** - Can require pre-approval  
✅ **User attribution** - Track who posted what  

### Content Moderation

✅ **Spam prevention** - Admin can hide/delete  
✅ **Inappropriate content** - Quick hiding  
✅ **Vendor accountability** - Track response rates  
✅ **Customer protection** - Moderate vendor answers  

---

## 🐛 Troubleshooting

### Questions not appearing in admin panel

**Solution:**
1. Verify migration ran successfully
2. Check tables exist in Supabase
3. Refresh the Vendor Q&A page
4. Check browser console for errors

### Cannot toggle visibility

**Solution:**
1. Check admin has proper permissions
2. Verify Supabase connection
3. Check browser console for errors

### Answers not linking to questions

**Solution:**
1. Verify `question_id` in answers table matches question's `id`
2. Check foreign key constraints are set up
3. Run migration again if needed

---

## 📚 Documentation Files

- **`VENDOR_QA_FEATURE.md`** ← This file (complete guide)
- **`migrations/003_create_vendor_qa_system.sql`** ← Database setup

---

## ✅ Implementation Checklist

### Database
- [ ] Run migration in Supabase
- [ ] Verify tables created
- [ ] Test triggers work

### Admin Panel
- [ ] Vendor Q&A appears in sidebar
- [ ] Statistics cards display
- [ ] Search works
- [ ] Filters work
- [ ] View details modal works
- [ ] Toggle visibility works
- [ ] Toggle approval works
- [ ] Delete works

### Mobile App
- [ ] Create question endpoint integrated
- [ ] Create answer endpoint integrated
- [ ] Q&A displayed on product pages
- [ ] Ask question UI implemented
- [ ] Answer notifications set up

---

## 🎉 Summary

### What You Get

✨ **Centralized Q&A management**  
✨ **Complete moderation tools**  
✨ **Search and filtering**  
✨ **Statistics dashboard**  
✨ **Easy mobile integration**  
✨ **Professional UI**  

### How It Works

📱 **Customers ask** → 💬 **Vendors answer** → 👨‍💼 **Admin moderates**

### Ready to Use

1. Run migration
2. Access Vendor Q&A in sidebar
3. Integrate API in mobile app
4. Start moderating!

---

Happy moderating! 💬✨

