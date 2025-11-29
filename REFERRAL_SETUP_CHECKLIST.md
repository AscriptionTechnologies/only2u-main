# Referral Code System - Setup Checklist

## ✅ Complete Setup Checklist

### Phase 1: Database Setup
- [ ] **Run SQL Migration**
  - File: `migrations/014_create_referral_codes.sql`
  - Location: Supabase SQL Editor
  - Action: Copy and execute entire file
  
- [ ] **Verify Tables Created**
  ```sql
  -- Run this to verify:
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  AND tablename LIKE 'referral%';
  ```
  Expected results:
  - `referral_codes`
  - `referral_code_usage`
  
- [ ] **Verify View Created**
  ```sql
  -- Run this to verify:
  SELECT viewname FROM pg_views WHERE schemaname = 'public' 
  AND viewname LIKE 'referral%';
  ```
  Expected result:
  - `referral_code_analytics`

- [ ] **Test Functions**
  ```sql
  -- Test validation function:
  SELECT * FROM validate_referral_code('TESTCODE');
  ```

### Phase 2: Admin Panel Setup
- [x] **Files Created**
  - ✅ `/app/admin/ReferralManagement/page.tsx`
  - ✅ `/app/admin/ReferralManagement/referralExportUtils.ts`
  - ✅ Updated `/app/components/Sidebar.tsx`

- [ ] **Access Admin Panel**
  - URL: `http://localhost:3000/admin/ReferralManagement` (dev)
  - URL: `https://yourdomain.com/admin/ReferralManagement` (prod)
  
- [ ] **Verify Sidebar Updated**
  - Check "Referral Codes" appears in sidebar
  - Click to navigate to page
  - Verify page loads without errors

### Phase 3: Generate Test Codes
- [ ] **Generate First Batch**
  - Set bulk count: 5
  - Description: "Test Campaign"
  - Click "Generate 5 Codes"
  
- [ ] **Verify Codes Generated**
  - Check codes appear in table
  - All should be Active status
  - Usage count should be 0
  
- [ ] **Test Edit Functionality**
  - Click "Edit" on any code
  - Change description
  - Update and verify changes saved

### Phase 4: Mobile App Integration
- [ ] **Add Validation Function**
  - Copy from `REFERRAL_API_EXAMPLES.md`
  - Add to your app's API utilities
  
- [ ] **Add Signup Integration**
  - Update signup flow
  - Add referral code input field
  - Implement validation on submit
  
- [ ] **Test Validation**
  - Try valid code → should succeed
  - Try invalid code → should show error
  - Try expired code → should show error
  
- [ ] **Add Usage Recording**
  - Record usage after successful signup
  - Include user details (email, phone, name)
  
- [ ] **Test End-to-End**
  - Create test user with referral code
  - Verify usage appears in admin panel
  - Check analytics update correctly

### Phase 5: Testing & Verification
- [ ] **Test Bulk Generation**
  - Generate 100 codes
  - Verify all unique
  - Check performance
  
- [ ] **Test Usage Tracking**
  - Create 5 test signups with same code
  - Verify usage count increments
  - Check "View Usage" shows all records
  
- [ ] **Test Expiration**
  - Create code with past expiration date
  - Try to use it → should fail
  - Verify shows as "Expired" in admin
  
- [ ] **Test Max Uses**
  - Create code with max_uses = 2
  - Use it twice successfully
  - Third attempt should fail
  - Verify shows "Limit Reached" in admin
  
- [ ] **Test Export**
  - Export codes → verify Excel downloads
  - View usage → export → verify data correct
  - Check all columns populated

### Phase 6: Production Deployment
- [ ] **Backup Existing Database**
  ```bash
  # From Supabase dashboard
  # Project Settings > Database > Backups
  ```
  
- [ ] **Run Migration in Production**
  - Use Supabase dashboard SQL editor
  - Run migration file
  - Verify tables created
  
- [ ] **Deploy Frontend**
  - Push code to repository
  - Deploy to production (Vercel/Netlify)
  - Verify deployment successful
  
- [ ] **Test Production Admin Panel**
  - Access production URL
  - Login as admin
  - Navigate to Referral Management
  - Generate test codes
  
- [ ] **Test Production Mobile App**
  - Update mobile app
  - Test referral flow
  - Verify usage tracked in production admin

### Phase 7: Launch
- [ ] **Generate Launch Codes**
  - Determine quantity needed
  - Set appropriate settings
  - Generate in batches if needed
  
- [ ] **Distribute Codes**
  - Export codes
  - Share with marketing team
  - Distribute to influencers/partners
  
- [ ] **Monitor Analytics**
  - Check dashboard daily
  - Track usage trends
  - Export reports weekly
  
- [ ] **Train Team**
  - Show team how to generate codes
  - Explain analytics dashboard
  - Demonstrate export functionality

---

## 🔍 Verification Commands

### Check Tables Exist
```sql
-- Should return 2 tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('referral_codes', 'referral_code_usage');
```

### Check View Exists
```sql
-- Should return rows
SELECT * FROM referral_code_analytics LIMIT 1;
```

### Check Functions Exist
```sql
-- Should return function definition
SELECT proname FROM pg_proc 
WHERE proname IN ('validate_referral_code', 'increment_referral_usage');
```

### Check Trigger Exists
```sql
-- Should return trigger
SELECT tgname FROM pg_trigger 
WHERE tgname = 'trigger_increment_referral_usage';
```

---

## 📊 Success Metrics

After setup, you should be able to:

### Admin Panel
- ✅ Generate 1-1000 codes in seconds
- ✅ View real-time analytics
- ✅ Track individual code performance
- ✅ Export data to Excel
- ✅ Manage code status (activate/deactivate)

### Mobile App
- ✅ Validate codes instantly
- ✅ Record usage automatically
- ✅ Handle errors gracefully
- ✅ Track user signups

### Analytics
- ✅ See total signups per code
- ✅ Track unique users
- ✅ View usage timeline
- ✅ Monitor active vs inactive codes
- ✅ Export comprehensive reports

---

## 🚨 Common Issues & Solutions

### Issue: Migration fails
**Solution**: Check Supabase role permissions. Ensure you're running as admin.

### Issue: Codes not appearing in admin panel
**Solution**: Check browser console for errors. Verify Supabase connection.

### Issue: Validation always returns false
**Solution**: Verify function exists. Check code spelling (case-sensitive).

### Issue: Usage not incrementing
**Solution**: Check trigger is enabled. Verify referral_code_id is correct UUID.

### Issue: Export not working
**Solution**: Check browser allows downloads. Verify export utils imported correctly.

### Issue: Sidebar not showing Referral Codes
**Solution**: Clear cache and reload. Verify Sidebar.tsx was updated correctly.

---

## 📞 Need Help?

### Documentation Files
1. `REFERRAL_CODE_SYSTEM.md` - Complete system guide
2. `REFERRAL_QUICK_START.md` - Quick setup guide
3. `REFERRAL_API_EXAMPLES.md` - Code examples
4. This file - Setup checklist

### Debugging Steps
1. Check browser console
2. Check Supabase logs
3. Verify database tables exist
4. Test with simple SQL queries
5. Check network requests in dev tools

---

## ✨ You're All Set!

Once all checkboxes are complete, your referral code system is live and ready to use!

**Next Steps:**
1. Generate your first real campaign codes
2. Distribute to users
3. Monitor analytics
4. Optimize based on data

Good luck with your referral campaigns! 🚀

