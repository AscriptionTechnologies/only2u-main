# Bulk Review Upload Guide

## 📋 Overview

You can now bulk upload product reviews using CSV files. This feature allows you to quickly add multiple reviews at once instead of entering them one by one.

## 🎯 Features

- **Bulk upload** multiple reviews via CSV/Excel files
- **Mandatory fields**: Only `name` and `rating` are required
- **Optional fields**: `comment`, `date`, `verified`
- **Validation**: Automatic validation with error reporting
- **Template download**: Sample CSV template provided

## 📁 CSV Format

### Required Columns:
1. **name** (or `reviewer_name` or `reviewer name`) - Reviewer's name
2. **rating** - Number between 1 and 5

### Optional Columns:
3. **comment** (or `review`) - Review text/comment
4. **date** (or `review_date` or `review date`) - Review date in YYYY-MM-DD format
5. **verified** (or `is_verified`) - `true`, `yes`, `1` for verified, anything else for not verified

## 📝 Sample CSV Format

```csv
name,rating,comment,date,verified
John Doe,5,Great product! Very satisfied with the quality.,2024-01-15,true
Jane Smith,4,Good value for money. Delivery was quick.,2024-01-14,true
Mike Johnson,5,Excellent! Exceeded my expectations.,2024-01-13,false
Sarah Williams,3,It's okay. Could be better.,2024-01-12,false
David Brown,5,Amazing quality and fast shipping!,2024-01-11,true
```

## 🚀 How to Use

### Step 1: Download Template
1. Go to **Product Form** page (Add Product or Edit Product)
2. Scroll to **"Product Reviews (Optional)"** section
3. Click the **"Template"** button (blue button)
4. A sample CSV file will be downloaded

### Step 2: Fill in Your Data
1. Open the downloaded `sample-reviews-template.csv` in Excel or Google Sheets
2. Replace the sample data with your actual reviews
3. **Ensure** `name` and `rating` columns are filled for all rows
4. Optional fields can be left empty
5. Save the file as CSV

### Step 3: Upload
1. Click the **"Upload CSV"** button (green button)
2. Select your CSV file
3. Wait for the upload to complete
4. You'll see a success message with the number of reviews imported

## ✅ Validation Rules

### Name Field:
- ✅ Cannot be empty
- ✅ Any text is accepted
- ❌ Empty rows are skipped

### Rating Field:
- ✅ Must be a number between 1 and 5
- ✅ Decimal values are rounded (e.g., 4.5 becomes 5)
- ❌ Values outside 1-5 range are rejected

### Comment Field:
- ✅ Can be empty
- ✅ Any text is accepted
- ℹ️ Commas in comments should be enclosed in quotes

### Date Field:
- ✅ Format: YYYY-MM-DD (e.g., 2024-01-15)
- ✅ If empty or invalid, current date is used
- ✅ Accepts various date formats (ISO standard recommended)

### Verified Field:
- ✅ `true`, `yes`, `1` = Verified
- ✅ `false`, `no`, `0`, or empty = Not verified
- ✅ Case insensitive

## 📊 Examples

### Minimal CSV (Required Fields Only):
```csv
name,rating
John Doe,5
Jane Smith,4
Mike Johnson,3
```

### Complete CSV (All Fields):
```csv
name,rating,comment,date,verified
John Doe,5,"Great product, very happy!",2024-01-15,true
Jane Smith,4,Good quality.,2024-01-14,false
Mike Johnson,3,,2024-01-13,false
```

### CSV with Comments Containing Commas:
```csv
name,rating,comment,date,verified
John Doe,5,"Great product, fast shipping, excellent quality!",2024-01-15,true
Jane Smith,4,"Good, but could be better",2024-01-14,false
```

## ⚠️ Error Handling

### Common Errors:

1. **Missing Required Columns**
   - Error: `CSV must have "name" and "rating" columns`
   - Solution: Ensure your CSV has headers named `name` and `rating`

2. **Empty Name**
   - Error: `Row X: Name is required`
   - Solution: Fill in the name field for that row

3. **Invalid Rating**
   - Error: `Row X: Rating must be a number between 1 and 5`
   - Solution: Ensure rating is a number from 1 to 5

4. **File Format**
   - Error: `Error parsing CSV file`
   - Solution: Ensure file is properly formatted as CSV

### Partial Import:
- If some rows have errors, valid rows will still be imported
- You'll see a summary: `Imported 10 reviews with 2 errors`
- First 5 errors are shown in the alert

## 🎨 UI Buttons

### Button Layout:
```
[➕ Add Review] [📤 Upload CSV] [📥 Template] [Show/Hide Reviews]
```

- **Pink Button (Add Review)**: Add a single review manually
- **Green Button (Upload CSV)**: Upload bulk reviews from CSV
- **Blue Button (Template)**: Download sample CSV template
- **Text Link (Show/Hide)**: Toggle review section visibility

## 💡 Tips

1. **Use Template**: Always start with the template to ensure correct format
2. **Test with Small File**: Upload a small test file first to verify format
3. **Check Errors**: Review any error messages carefully
4. **Date Format**: Use YYYY-MM-DD for dates to avoid parsing issues
5. **Quotes for Commas**: If your comment has commas, wrap it in quotes
6. **No Media**: Bulk upload doesn't support images/videos (add those manually after import)

## 📌 Notes

- **Profile pictures**, **review images**, and **review videos** cannot be uploaded via CSV
- These can be added manually after importing reviews
- The feature automatically expands the review section after successful upload
- File input resets after upload (can upload multiple times)
- All uploaded reviews are added to existing reviews (not replaced)

## 🔧 Technical Details

- **Supported formats**: `.csv`, `.xlsx`, `.xls`
- **Max file size**: Limited by browser (typically 50-100MB)
- **Encoding**: UTF-8 recommended
- **Line endings**: Any (CRLF, LF)
- **Parser**: Client-side JavaScript (no server processing)

## 🆘 Troubleshooting

### Problem: "CSV must have name and rating columns"
**Solution**: Check that your first row contains headers `name` and `rating`

### Problem: Reviews not appearing after upload
**Solution**: Click "Show Reviews" to expand the section

### Problem: Special characters not displaying correctly
**Solution**: Save your CSV with UTF-8 encoding

### Problem: Excel adds extra commas
**Solution**: Use Google Sheets or ensure proper CSV export from Excel

## 📞 Support

For issues or questions:
1. Check this guide first
2. Verify your CSV format matches the template
3. Test with the provided sample template
4. Check browser console for detailed error messages

---

**Happy Bulk Uploading! 🚀**

