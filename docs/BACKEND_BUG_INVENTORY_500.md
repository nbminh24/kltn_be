# 🐛 BACKEND BUG REPORT - Inventory API 500 Error

**Date:** 2024-12-06  
**Priority:** HIGH  
**Status:** ❌ BLOCKING  
**Module:** Admin Inventory

---

## 📍 **ENDPOINT**

```
GET /api/v1/admin/inventory
```

**Expected:** 200 OK with inventory list  
**Actual:** 500 Internal Server Error

---

## 🔥 **ERROR DETAILS**

### **Frontend Call**
```typescript
// app/admin/inventory/page.tsx:63
const response = await adminInventoryService.getInventory({
  page: 1,
  limit: 20,
  low_stock: true, // or out_of_stock: true
});
```

### **API Request**
```
GET http://localhost:3001/api/v1/admin/inventory?page=1&limit=20&low_stock=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### **Error Response**
```
Status: 500 Internal Server Error
```

---

## 📊 **EXPECTED RESPONSE**

```typescript
{
  items: InventoryItem[],
  total: number,
  page: number,
  limit: number,
  summary: {
    total_variants: number,
    in_stock: number,
    low_stock_variants: number,
    out_of_stock_variants: number
  }
}
```

---

## 🔍 **LIKELY CAUSES**

### **1. Missing API Endpoint**
Inventory endpoint might not be implemented in backend.

### **2. Complex Join Query Error**
Query joining product_variants with products, sizes, colors might have syntax error:
```sql
-- Possible issue
SELECT 
  pv.id,
  p.name,
  s.name as size,
  c.name as color,
  pv.total_stock,
  pv.reserved_stock,
  (pv.total_stock - pv.reserved_stock) as available_stock
FROM product_variants pv
LEFT JOIN products p ON p.id = pv.product_id
LEFT JOIN sizes s ON s.id = pv.size_id
LEFT JOIN colors c ON c.id = pv.color_id
WHERE pv.status = 'active'
```

### **3. Low Stock Filter Logic**
Filtering by `available_stock <= reorder_level` might cause error.

### **4. Missing Relations**
Entity relations between ProductVariant, Product, Size, Color not configured.

---

## 🛠️ **SUGGESTED BACKEND FIX**

```typescript
@Get()
@UseGuards(AdminJwtAuthGuard)
async getInventory(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
  @Query('low_stock') lowStock?: boolean,
  @Query('out_of_stock') outOfStock?: boolean,
  @Query('search') search?: string,
) {
  try {
    const query = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .select([
        'variant.id',
        'variant.sku',
        'variant.total_stock',
        'variant.reserved_stock',
        'variant.reorder_level',
        'product.id',
        'product.name',
        'size.id',
        'size.name',
        'color.id',
        'color.name',
      ])
      .where('variant.status = :status', { status: 'active' });

    // Add calculated field
    query.addSelect(
      'variant.total_stock - variant.reserved_stock',
      'available_stock'
    );

    // Filter by stock status
    if (outOfStock) {
      query.andWhere('variant.total_stock = 0');
    } else if (lowStock) {
      query.andWhere(
        '(variant.total_stock - variant.reserved_stock) <= variant.reorder_level'
      );
      query.andWhere('variant.total_stock > 0');
    }

    // Search filter
    if (search) {
      query.andWhere(
        '(product.name ILIKE :search OR variant.sku ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('variant.total_stock', 'ASC')
      .getManyAndCount();

    // Calculate summary
    const summary = await this.calculateInventorySummary();

    return {
      items: items.map(v => ({
        variant_id: v.id,
        product_name: v.product.name,
        sku: v.sku,
        size: v.size.name,
        color: v.color.name,
        current_stock: v.total_stock,
        reserved_stock: v.reserved_stock,
        available_stock: v.total_stock - v.reserved_stock,
        reorder_level: v.reorder_level,
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      summary,
    };
  } catch (error) {
    console.error('Inventory query error:', error);
    throw new InternalServerErrorException('Failed to fetch inventory');
  }
}
```

---

## 📝 **TEMPORARY WORKAROUND**

Frontend needs graceful error handling to show empty state.

---

**Report Created:** 2024-12-06  
**Severity:** HIGH - Blocks inventory module completely
