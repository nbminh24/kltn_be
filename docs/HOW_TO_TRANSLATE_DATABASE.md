# 🌐 How To Translate Database (Vietnamese → English)

**Date:** December 9, 2025  
**Purpose:** Guide to translate product data from Vietnamese to English

---

## 📊 Current Situation

- ✅ Backend API working with Vietnamese data
- ❌ Need to translate to English
- ⚠️ Large amount of data to translate

---

## 🎯 Solution Options

### **Option 1: Automated Script (RECOMMENDED)** ⭐

**File:** `scripts/translate-products.ts`

**Pros:**
- ✅ Fast (automated)
- ✅ Consistent translations
- ✅ Backup & rollback support
- ✅ Dry-run mode

**Cons:**
- ⚠️ Need to add more translation mappings
- ⚠️ May need manual review

**How to use:**

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Run translation script
npx ts-node scripts/translate-products.ts

# 3. Verify results in database
```

**Translation mappings included:**
- Product types: Áo Khoác → Jacket, Áo Thun → T-Shirt, etc.
- Attributes: Nam → Men, Form Regular → Regular Fit, etc.
- Slugs: ao-khoac → jacket, quan-jean → jeans, etc.

**To add more translations:**
Edit `scripts/translate-products.ts`:
```typescript
const TRANSLATION_MAP = {
  'Your Vietnamese Term': 'English Translation',
  // Add more...
};
```

---

### **Option 2: SQL Batch Update**

**For simple find-replace:**

```sql
-- Backup first!
CREATE TABLE products_backup AS SELECT * FROM products;
CREATE TABLE categories_backup AS SELECT * FROM categories;

-- Update products
UPDATE products 
SET 
  name = REPLACE(REPLACE(REPLACE(name,
    'Áo Khoác', 'Jacket'),
    'Áo Thun', 'T-Shirt'),
    'Quần Jean', 'Jeans'),
  slug = REPLACE(REPLACE(REPLACE(slug,
    'ao-khoac', 'jacket'),
    'ao-thun', 't-shirt'),
    'quan-jean', 'jeans');

-- Update categories
UPDATE categories 
SET 
  name = REPLACE(REPLACE(name,
    'Áo Khoác', 'Jackets'),
    'Áo Thun', 'T-Shirts'),
  slug = REPLACE(REPLACE(slug,
    'ao-khoac', 'jackets'),
    'ao-thun', 't-shirts');

-- If need to rollback:
-- DROP TABLE products;
-- ALTER TABLE products_backup RENAME TO products;
```

**Pros:**
- ✅ Very fast (single query)
- ✅ Simple for basic replacements

**Cons:**
- ❌ Manual work for each term
- ❌ Hard to maintain
- ❌ Risk of breaking slugs

---

### **Option 3: Export → Translate → Import**

**Step 1: Export to CSV**
```bash
# Export products
psql -U postgres -d your_db -c "COPY (SELECT id, name, slug, description FROM products) TO '/tmp/products.csv' WITH CSV HEADER;"

# Or use pgAdmin export feature
```

**Step 2: Translate in Excel/Google Sheets**
- Open CSV file
- Use Google Translate or manual translation
- Save as new CSV

**Step 3: Import back**
```sql
-- Backup first
CREATE TABLE products_backup AS SELECT * FROM products;

-- Update from CSV
UPDATE products p
SET 
  name = t.name_en,
  slug = t.slug_en,
  description = t.description_en
FROM products_translated t
WHERE p.id = t.id;
```

**Pros:**
- ✅ Full control over translations
- ✅ Can use Google Translate for bulk
- ✅ Easy to review

**Cons:**
- ❌ Manual work required
- ❌ Time-consuming for large datasets
- ❌ Risk of data import errors

---

### **Option 4: Google Translate API (Auto Translation)**

**For completely automated translation:**

```typescript
import { Translate } from '@google-cloud/translate/build/src/v2';

const translate = new Translate({ key: 'YOUR_API_KEY' });

async function translateWithGoogle(text: string) {
  const [translation] = await translate.translate(text, 'en');
  return translation;
}

// Use in migration script
const translatedName = await translateWithGoogle(product.name);
```

**Pros:**
- ✅ Fully automated
- ✅ High quality translations
- ✅ Fast

**Cons:**
- ❌ Costs money (Google Cloud API)
- ❌ May not understand fashion context
- ❌ Need API setup

---

## 🚀 Recommended Approach

### **For your case (many products):**

**Step 1: Use Automated Script (Fast first pass)**
```bash
npx ts-node scripts/translate-products.ts
```

**Step 2: Review & Manual Fix**
```sql
-- Check translations
SELECT id, name, slug 
FROM products 
WHERE name LIKE '%Áo%' OR name LIKE '%Quần%'
ORDER BY id;

-- Manual fix problematic ones
UPDATE products 
SET name = 'Correct English Name', slug = 'correct-slug'
WHERE id = 123;
```

**Step 3: Test API**
```bash
curl.exe -X GET "http://localhost:3001/internal/products?search=jacket" -H "x-api-key: KhoaBiMatChoRasaGoi"
```

---

## 📋 Translation Reference

### **Common Product Terms:**

| Vietnamese | English | Slug (VN) | Slug (EN) |
|------------|---------|-----------|-----------|
| Áo Khoác | Jacket | ao-khoac | jacket |
| Áo Thun | T-Shirt | ao-thun | t-shirt |
| Áo Sơ Mi | Shirt | ao-so-mi | shirt |
| Áo Polo | Polo Shirt | ao-polo | polo-shirt |
| Quần Jean | Jeans | quan-jean | jeans |
| Quần Short | Shorts | quan-short | shorts |
| Quần Dài | Pants | quan-dai | pants |
| Giày Thể Thao | Sneakers | giay-the-thao | sneakers |

### **Attributes:**

| Vietnamese | English |
|------------|---------|
| Nam | Men / Men's |
| Nữ | Women / Women's |
| Form Regular | Regular Fit |
| Form Slim | Slim Fit |
| Form Loose | Loose Fit |
| Form Oversize | Oversize |
| Màu Đen | Black |
| Màu Trắng | White |
| Màu Xanh | Blue |

### **Materials:**

| Vietnamese | English |
|------------|---------|
| Cotton | Cotton |
| Denim | Denim |
| Kaki | Khaki |
| Polyester | Polyester |
| Da | Leather |
| Nỉ | Fleece |

---

## ⚠️ Important Notes

### **Before Running:**

1. **Backup database:**
   ```bash
   pg_dump -U postgres your_db > backup_$(date +%Y%m%d).sql
   ```

2. **Test on small dataset first:**
   ```sql
   -- Test with 5 products
   SELECT * FROM products LIMIT 5;
   ```

3. **Check slug uniqueness:**
   ```sql
   SELECT slug, COUNT(*) 
   FROM products 
   GROUP BY slug 
   HAVING COUNT(*) > 1;
   ```

### **After Running:**

1. **Verify translations:**
   ```sql
   SELECT name, slug FROM products LIMIT 20;
   SELECT name, slug FROM categories;
   ```

2. **Test search API:**
   ```bash
   curl.exe -X GET "http://localhost:3001/internal/products?search=jacket" -H "x-api-key: KhoaBiMatChoRasaGoi"
   ```

3. **Check frontend:**
   - Browse products
   - Test search
   - Verify URLs work

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Restore from backup
DROP TABLE products;
DROP TABLE categories;

-- Restore backup
psql -U postgres your_db < backup_20251209.sql
```

Or if you created backup tables:

```sql
-- Rollback products
DROP TABLE products;
ALTER TABLE products_backup RENAME TO products;

-- Rollback categories
DROP TABLE categories;
ALTER TABLE categories_backup RENAME TO categories;
```

---

## 📞 Need Help?

### **Common Issues:**

**Issue 1: Slug conflicts**
```sql
-- Find duplicates
SELECT slug, COUNT(*) FROM products GROUP BY slug HAVING COUNT(*) > 1;

-- Fix by adding numbers
UPDATE products SET slug = slug || '-' || id WHERE slug IN (SELECT slug FROM products GROUP BY slug HAVING COUNT(*) > 1);
```

**Issue 2: Broken references**
```sql
-- Check foreign keys
SELECT * FROM variants WHERE product_id NOT IN (SELECT id FROM products);
```

**Issue 3: Search not working**
- Clear cache
- Restart backend
- Check `unaccent` extension installed

---

## 🎯 Quick Start

**Fastest way to translate:**

```bash
# 1. Backup
pg_dump -U postgres kltn_db > backup.sql

# 2. Run script
npx ts-node scripts/translate-products.ts

# 3. Test
curl.exe -X GET "http://localhost:3001/internal/products?search=jacket" -H "x-api-key: KhoaBiMatChoRasaGoi"

# 4. If problems, rollback:
psql -U postgres kltn_db < backup.sql
```

---

**Created:** 2025-12-09  
**Status:** Ready to use  
**Estimated time:** 5-10 minutes for automated script
