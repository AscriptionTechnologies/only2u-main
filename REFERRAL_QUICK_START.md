# Referral Code System - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- migrations/014_create_referral_codes.sql
```

### Step 2: Access Admin Panel
Navigate to: `/admin/ReferralManagement`

The sidebar has been updated with "Referral Codes" menu item.

### Step 3: Generate Your First Codes
1. Set "Bulk Count" to 10
2. Add description: "Launch Campaign"
3. Click "Generate 10 Codes"
4. ✅ Done! You now have 10 referral codes

## 📊 What You Get

### Admin Features
- **Bulk Generation**: Create 1-1000 codes at once
- **Real-time Analytics**: Track usage instantly
- **Usage Details**: See who used each code
- **Export Data**: Download Excel reports
- **Status Management**: Activate/deactivate codes

### Analytics Dashboard Shows:
- Total signups per code
- Unique users count
- First and last use dates
- Remaining uses
- Code status (Active/Expired/Inactive)

## 🔗 Mobile App Integration

### Validate Code on Signup
```javascript
// Call this when user enters referral code
const { data } = await supabase.rpc('validate_referral_code', { 
  p_code: userCode 
});

if (!data[0].is_valid) {
  alert(data[0].message);
  return;
}
```

### Record Usage After Signup
```javascript
// After successful user creation
await supabase.from('referral_code_usage').insert({
  referral_code_id: validationData.referral_code_id,
  referral_code: userCode,
  user_email: newUser.email,
  user_phone: newUser.phone,
  user_name: newUser.name
});
```

## 📋 Code Format
- **Length**: 8 characters
- **Characters**: A-Z (no vowels to avoid words), 2-9 (no 0,1)
- **Example**: `K7N3R2M4`
- **Uniqueness**: Guaranteed unique

## 🎯 Common Use Cases

### Marketing Campaign
```
Bulk Count: 100
Description: "Summer Sale 2025"
Max Uses: 1 (per code)
Expires: 2025-12-31
```

### Influencer Partnership
```
Bulk Count: 50
Description: "Influencer @username"
Max Uses: Unlimited
Expires: None
```

### Limited Time Promotion
```
Bulk Count: 500
Description: "Flash Sale"
Max Uses: 3 (per code)
Expires: 2025-06-30
```

## 🔍 Tracking & Analytics

### View Code Performance
1. Go to Referral Management
2. Click "View Usage" on any code
3. See all users who signed up with that code

### Export Reports
- **Export Codes**: All codes with analytics
- **Export Usage**: Detailed usage for specific code

### Filter & Search
- Search by code or description
- Filter by status (Active/Inactive/Expired)
- View summary statistics in cards

## ⚙️ Configuration Options

| Field | Description | Example |
|-------|-------------|---------|
| Bulk Count | Number of codes to generate | 10 |
| Max Uses | Limit per code (empty = unlimited) | 5 |
| Expires At | Expiration date/time | 2025-12-31 23:59 |
| Description | Campaign name/notes | "Spring Promo" |
| Active | Can be used right now | ✓ |

## 📈 Analytics Available

### Summary Cards
- **Active Codes**: Currently usable
- **Total Codes**: All generated
- **Total Signups**: Across all codes
- **Expired/Inactive**: Unusable codes

### Per Code Analytics
- Total signups
- Unique users
- Usage count
- Remaining uses
- First use date
- Last use date
- Current status

## 🛠️ Database Tables

### referral_codes
Main table storing generated codes with settings

### referral_code_usage
Individual usage records (one row per signup)

### referral_code_analytics (VIEW)
Pre-aggregated analytics for performance

## 🔐 Validation Logic

A code is valid if:
1. ✅ Code exists
2. ✅ Is active (`is_active = true`)
3. ✅ Not expired (`expires_at` is null or future)
4. ✅ Under max uses (`usage_count < max_uses`)

## 💡 Pro Tips

1. **Use Descriptions**: Help identify campaigns later
2. **Set Max Uses**: Prevent abuse on shared codes
3. **Export Regularly**: Backup your analytics data
4. **Monitor Active Codes**: Deactivate underperforming ones
5. **Unique per Campaign**: Generate separate batches for different campaigns

## 🐛 Troubleshooting

### Code not working?
- Check if it's active
- Verify expiration date
- Check max uses not reached

### Usage not tracking?
- Ensure trigger is enabled
- Check user has insert permission
- Verify correct `referral_code_id` used

### Can't generate codes?
- Check bulk count (1-1000 only)
- Ensure you have database permissions
- Check browser console for errors

## 📖 Full Documentation
See `REFERRAL_CODE_SYSTEM.md` for complete details.

## ✅ Checklist

- [ ] Run migration `014_create_referral_codes.sql`
- [ ] Verify tables created in Supabase
- [ ] Access `/admin/ReferralManagement`
- [ ] Generate test codes
- [ ] Test code validation in your app
- [ ] Test usage recording
- [ ] View analytics
- [ ] Export test data
- [ ] Deploy to production

## 🎉 You're Ready!

Your referral code system is now live. Start generating codes and tracking your user acquisition campaigns!

