# Referral Code System

## Overview
The Referral Code System allows you to generate and track referral codes for user acquisition campaigns. This system provides bulk code generation, usage tracking, and comprehensive analytics.

## Features
- ✅ Bulk generation of referral codes (1-1000 codes at once)
- ✅ Track individual usage of each code
- ✅ Analytics dashboard with key metrics
- ✅ User signup tracking with referral codes
- ✅ Export functionality for codes and usage data
- ✅ Active/Inactive status management
- ✅ Expiration date support
- ✅ Max usage limits per code
- ✅ Real-time analytics view

## Database Setup

### Step 1: Run the Migration
Execute the migration file to create the necessary tables:

```sql
-- Run this in your Supabase SQL editor
-- File: migrations/014_create_referral_codes.sql
```

This creates:
1. `referral_codes` table - Stores generated referral codes
2. `referral_code_usage` table - Tracks each time a code is used
3. `referral_code_analytics` view - Aggregated analytics data
4. Functions for validating codes and tracking usage
5. Triggers for automatic usage counting

### Step 2: Verify Tables
Check that the following were created:
- ✅ `referral_codes` table
- ✅ `referral_code_usage` table
- ✅ `referral_code_analytics` view
- ✅ `validate_referral_code()` function
- ✅ `increment_referral_usage()` function
- ✅ Trigger `trigger_increment_referral_usage`

## Admin Panel Access

### Navigate to Referral Management
Access the referral code management page at:
```
/admin/ReferralManagement
```

### Add to Sidebar
Update your sidebar navigation to include the referral management link:

```tsx
// In app/components/Sidebar.tsx or similar
{
  name: "Referral Codes",
  href: "/admin/ReferralManagement",
  icon: <ReferralIcon />
}
```

## Using the System

### 1. Generate Referral Codes

#### Single Code Generation
1. Go to Referral Management page
2. Set "Bulk Count" to 1
3. (Optional) Fill in:
   - Description/Campaign Name
   - Max Uses (leave empty for unlimited)
   - Expiration Date
4. Click "Generate Code"

#### Bulk Code Generation
1. Set "Bulk Count" to desired number (1-1000)
2. All generated codes will share the same settings:
   - Description
   - Max Uses
   - Expiration Date
   - Active Status
3. Click "Generate X Codes"
4. Unique 8-character codes will be auto-generated

### 2. Manage Codes

#### Edit a Code
- Click "Edit" on any code row
- Modify settings (description, max uses, expiration, active status)
- Note: You cannot change the code itself once created

#### Activate/Deactivate
- Click "Activate" or "Deactivate" to toggle code status
- Inactive codes cannot be used by users

#### Delete a Code
- Click "Delete" to permanently remove a code
- This also deletes all usage records associated with it

### 3. View Analytics

#### Dashboard Overview
The top cards show:
- **Active Codes**: Currently active and usable codes
- **Total Codes**: All codes in the system
- **Total Signups**: Sum of all signups from all codes
- **Expired/Inactive**: Codes that are no longer usable

#### Code Table Columns
- **Code**: The referral code (8 alphanumeric characters)
- **Usage Stats**: 
  - Total signups using this code
  - Unique users (based on email/phone)
  - Remaining uses
- **Created**: When the code was generated
- **Expires**: Expiration date (if set)
- **Status**: Active, Inactive, Expired, or Limit Reached

### 4. Track Usage

#### View Usage Details
1. Click "View Usage" on any code
2. Modal opens showing all usage records:
   - User details (name, email, phone)
   - Timestamp of signup
   - IP address
   - User agent

#### Export Usage Data
- In the usage modal, click "Export"
- Downloads Excel file with all usage records for that code

### 5. Export Data

#### Export All Codes
- Click "Export Codes" button at the top
- Downloads Excel with:
  - Summary statistics
  - Complete list of all codes with analytics

#### Export Specific Usage
- Open usage modal for a code
- Click "Export" in the modal
- Downloads usage details for that specific code

## Mobile App Integration

### Step 1: Validate Referral Code
When a user enters a referral code during signup, validate it first:

```javascript
// Example API call to validate code
const response = await supabase
  .rpc('validate_referral_code', { p_code: userEnteredCode });

const { is_valid, message, referral_code_id } = response.data[0];

if (!is_valid) {
  // Show error to user
  alert(message);
  return;
}

// Proceed with signup
```

### Step 2: Record Usage on Signup
After successful user signup:

```javascript
// Record the referral code usage
const { error } = await supabase
  .from('referral_code_usage')
  .insert({
    referral_code_id: referral_code_id,
    referral_code: userEnteredCode,
    user_id: newUser.id,  // From your users table
    user_email: newUser.email,
    user_phone: newUser.phone,
    user_name: newUser.name,
    ip_address: clientIP,  // Optional
    user_agent: navigator.userAgent,  // Optional
    metadata: {
      // Any additional tracking data
      signup_source: 'mobile_app',
      platform: 'ios' // or 'android'
    }
  });

if (error) {
  console.error('Failed to record referral usage:', error);
  // Note: Don't block signup if this fails
}
```

### Step 3: Complete Signup Flow
```javascript
// Example complete flow
async function signupWithReferral(userData, referralCode) {
  // 1. Validate referral code
  const validation = await validateReferralCode(referralCode);
  if (!validation.is_valid) {
    throw new Error(validation.message);
  }
  
  // 2. Create user account
  const newUser = await createUserAccount(userData);
  
  // 3. Record referral usage
  await recordReferralUsage({
    referral_code_id: validation.referral_code_id,
    referral_code: referralCode,
    user_id: newUser.id,
    user_email: newUser.email,
    user_phone: newUser.phone,
    user_name: newUser.name
  });
  
  return newUser;
}
```

## API Reference

### validate_referral_code(p_code)
Validates if a referral code can be used.

**Parameters:**
- `p_code` (VARCHAR): The referral code to validate

**Returns:**
```sql
{
  is_valid: BOOLEAN,
  message: TEXT,
  referral_code_id: UUID
}
```

**Validation Checks:**
- Code exists
- Code is active
- Code hasn't expired
- Code hasn't reached max usage limit

### Views

#### referral_code_analytics
Pre-aggregated analytics for each code.

**Columns:**
- All columns from `referral_codes` table
- `total_signups`: Total number of signups
- `unique_users`: Count of unique users (by email)
- `first_use_date`: First time code was used
- `last_use_date`: Most recent usage
- `status`: Computed status (Active, Inactive, Expired, Limit Reached)

## Filters and Search

### Search
- Search by code or description
- Case-insensitive matching

### Status Filter
- **All Statuses**: Show everything
- **Active**: Only active and usable codes
- **Inactive**: Manually deactivated codes
- **Expired**: Codes past expiration date

## Best Practices

### Code Generation
1. Use descriptive campaign names in the description field
2. Set reasonable max uses based on campaign size
3. Set expiration dates for time-limited campaigns
4. Generate codes in bulk for efficiency

### Tracking
1. Always validate codes before allowing signup
2. Record usage immediately after successful signup
3. Include user details (email/phone) for better analytics
4. Use metadata field for additional campaign tracking

### Analytics
1. Export data regularly for backup
2. Monitor active codes performance
3. Deactivate underperforming codes
4. Set reasonable expiration dates

## Security Considerations

1. **Code Format**: 8 alphanumeric characters (uppercase letters and numbers)
2. **Uniqueness**: System ensures no duplicate codes
3. **Validation**: Always validate on server-side
4. **Rate Limiting**: Consider adding rate limiting to prevent abuse
5. **Usage Tracking**: IP and user agent help detect fraudulent activity

## Troubleshooting

### Code Not Validating
- Check if code is active
- Verify expiration date hasn't passed
- Ensure max uses hasn't been reached

### Usage Not Recording
- Verify `referral_code_id` is correct
- Check trigger is enabled
- Ensure user has permission to insert into `referral_code_usage`

### Analytics Not Updating
- Refresh the view: `REFRESH MATERIALIZED VIEW referral_code_analytics` (if using materialized view)
- Check if trigger is firing correctly
- Verify usage records are being inserted

## Future Enhancements

Potential features to add:
- [ ] Reward/incentive tracking per code
- [ ] Custom code generation (user-defined codes)
- [ ] Multi-tier referral tracking
- [ ] Integration with discount codes
- [ ] Email campaigns with unique codes
- [ ] QR code generation for physical marketing
- [ ] Time-based analytics (daily/weekly/monthly charts)

## Support

For issues or questions:
1. Check Supabase logs for error messages
2. Verify migration ran successfully
3. Check browser console for frontend errors
4. Review network requests in developer tools

