# 📤 Referral Code CSV Upload Guide

## ✅ Feature Added!

You can now upload custom referral codes from a CSV file!

---

## 🚀 How to Use

### Step 1: Prepare Your CSV File

**CSV Format:**
```csv
code,description,max_uses,expires_at
SUMMER2024,Summer Campaign 2024,100,2024-12-31
WELCOME10,Welcome Campaign,50,2024-12-31
CUSTOM123,Custom Code,10,2024-12-31
```

**Columns:**
- **code** (required) - The referral code (will be converted to uppercase)
- **description** (optional) - Campaign name or description
- **max_uses** (optional) - Maximum number of uses (number or "unlimited")
- **expires_at** (optional) - Expiration date (YYYY-MM-DD or YYYY-MM-DD HH:MM)

### Step 2: Upload CSV

1. Go to `/admin/ReferralManagement`
2. Click **"Upload CSV"** button
3. Select your CSV file
4. Review the format instructions
5. Click **"Upload Codes"**

### Step 3: Review Results

- ✅ Success message shows how many codes were uploaded
- ⚠️ Duplicate codes are skipped (shown in message)
- ❌ Errors are displayed if format is invalid

---

## 📋 CSV Format Details

### Required Column

**code** - The referral code
- Must be unique
- Will be converted to uppercase
- Cannot be empty
- Duplicates will be skipped

### Optional Columns

**description** - Campaign or description
- If not provided, uses form description
- Can be empty

**max_uses** - Maximum uses
- Number (e.g., `100`)
- Or text "unlimited" (case-insensitive)
- If not provided, uses form setting
- If form is empty, unlimited

**expires_at** - Expiration date
- Format: `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`
- Examples: `2024-12-31`, `2024-12-31 23:59`
- If not provided, uses form expiration
- If form is empty, no expiration

---

## 📝 CSV Examples

### Example 1: Simple Codes
```csv
code
SUMMER2024
WELCOME10
PROMO50
```

### Example 2: With Descriptions
```csv
code,description
SUMMER2024,Summer Campaign 2024
WELCOME10,Welcome Campaign
PROMO50,Flash Sale Promotion
```

### Example 3: Full Details
```csv
code,description,max_uses,expires_at
SUMMER2024,Summer Campaign 2024,100,2024-12-31
WELCOME10,Welcome Campaign,50,2024-12-31
INFLUENCER1,Influencer Partnership,unlimited,2025-06-30
PROMO50,Flash Sale,200,2024-08-31
```

### Example 4: With Header Row
```csv
code,description,max_uses,expires_at
SUMMER2024,Summer Campaign 2024,100,2024-12-31
WELCOME10,Welcome Campaign,50,2024-12-31
```

**Note:** Header row is optional. If first row contains "code" or "referral", it's treated as header.

---

## 🎯 Use Cases

### Bulk Import from Marketing Campaign

```csv
code,description,max_uses,expires_at
INSTA2024,Instagram Campaign,500,2024-12-31
FACEBOOK2024,Facebook Campaign,500,2024-12-31
TIKTOK2024,TikTok Campaign,500,2024-12-31
```

### Influencer Partnership Codes

```csv
code,description,max_uses,expires_at
SARAH2024,Influencer Sarah,unlimited,2025-12-31
MIKE2024,Influencer Mike,unlimited,2025-12-31
PRIYA2024,Influencer Priya,unlimited,2025-12-31
```

### Event-Specific Codes

```csv
code,description,max_uses,expires_at
BLACKFRIDAY,Black Friday Sale,1000,2024-11-30
CYBERMONDAY,Cyber Monday Sale,1000,2024-12-02
CHRISTMAS,Christmas Sale,500,2024-12-25
```

### Custom Branded Codes

```csv
code,description
BRAND2024,Brand Partnership
VIP2024,VIP Customer Codes
STAFF2024,Staff Referral Codes
```

---

## ⚙️ How It Works

### 1. CSV Parsing
- Reads CSV file line by line
- Detects header row automatically
- Handles quoted values
- Trims whitespace

### 2. Validation
- Checks code is not empty
- Validates uniqueness (against existing codes)
- Validates max_uses is a number
- Validates expires_at is a valid date

### 3. Default Values
If CSV column is empty, uses form values:
- **description** → Form description
- **max_uses** → Form max uses
- **expires_at** → Form expiration
- **is_active** → Form active status

### 4. Duplicate Handling
- Checks against existing codes in database
- Skips duplicates
- Shows count of skipped duplicates
- Only uploads unique codes

### 5. Batch Insert
- Inserts all valid codes in one transaction
- Faster than individual inserts
- All or nothing (if one fails, all fail)

---

## 🔍 Error Handling

### Common Errors

**"No valid codes found in CSV file"**
- CSV is empty
- All rows are invalid
- Check CSV format

**"All codes in CSV already exist"**
- All codes are duplicates
- Check existing codes
- Use different codes

**"Failed to process CSV file"**
- Invalid CSV format
- File encoding issue
- Try saving as UTF-8

**"Failed to upload codes from CSV"**
- Database error
- Check server logs
- Verify database connection

---

## 💡 Best Practices

### 1. Code Format
- Use uppercase letters and numbers
- Keep codes readable (e.g., `SUMMER2024` not `S7M3R2024`)
- Make them brandable

### 2. File Size
- Recommended: < 10,000 codes per file
- For larger batches, split into multiple files
- Each upload processes sequentially

### 3. Validation Before Upload
- Check for duplicates in your CSV
- Verify date formats
- Test with small batch first

### 4. Backup
- Export existing codes before bulk upload
- Keep CSV files as backup
- Document what was uploaded

### 5. Naming Convention
- Use descriptive filenames: `summer-campaign-2024.csv`
- Include date: `referral-codes-2024-11-27.csv`
- Version control: `campaign-v2.csv`

---

## 📊 CSV Template

Download the template file:
```
public/referral-codes-template.csv
```

**Template includes:**
- Header row with column names
- Example rows with different formats
- Comments explaining each column

---

## 🧪 Testing

### Test with Sample CSV

1. Create test CSV:
```csv
code,description
TEST001,Test Code 1
TEST002,Test Code 2
```

2. Upload via admin panel
3. Verify codes appear in table
4. Delete test codes after verification

### Verify Upload

After upload:
1. Check summary cards (count should increase)
2. Search for uploaded codes
3. View individual codes
4. Verify settings (max uses, expiration, etc.)

---

## 🔧 Troubleshooting

### CSV Not Uploading

**Check:**
1. File is `.csv` format
2. File is not corrupted
3. File encoding is UTF-8
4. File size is reasonable (< 10MB)

### Codes Not Appearing

**Check:**
1. No errors in upload message
2. Refresh the page
3. Check filters (might be filtered out)
4. Verify database connection

### Duplicate Codes

**Solution:**
- CSV contains codes that already exist
- System automatically skips duplicates
- Check success message for count
- Use different codes or delete existing ones first

### Date Format Issues

**Valid formats:**
- `2024-12-31`
- `2024-12-31 23:59`
- `2024-12-31 23:59:59`

**Invalid formats:**
- `12/31/2024` (US format)
- `31-12-2024` (European format)
- `Dec 31, 2024` (text format)

---

## 📈 Performance

### Upload Speed
- ~100 codes/second
- 1,000 codes = ~10 seconds
- 10,000 codes = ~100 seconds

### Recommendations
- Upload in batches of 1,000-5,000 codes
- For very large batches, use multiple files
- Monitor upload progress

---

## ✅ Checklist

Before uploading:
- [ ] CSV file is properly formatted
- [ ] Codes are unique (check for duplicates)
- [ ] Date formats are correct
- [ ] Max uses values are valid numbers
- [ ] File is saved as UTF-8 encoding
- [ ] Tested with small batch first

After uploading:
- [ ] Verify codes appear in table
- [ ] Check summary cards updated
- [ ] Verify settings (max uses, expiration)
- [ ] Test one code to ensure it works
- [ ] Export codes as backup

---

## 🎉 You're Ready!

**CSV upload is now available!**

1. Click "Upload CSV" button
2. Select your CSV file
3. Review format instructions
4. Upload and verify

**Start importing your referral codes in bulk!** 🚀

---

## 📞 Need Help?

### Quick Reference

**CSV Format:**
```
code,description,max_uses,expires_at
CODE1,Description,100,2024-12-31
```

**Download Template:**
- `public/referral-codes-template.csv`

**See Also:**
- `REFERRAL_CODE_SYSTEM.md` - Complete system guide
- `REFERRAL_QUICK_START.md` - Quick start guide

---

**Happy uploading!** 📤✨

