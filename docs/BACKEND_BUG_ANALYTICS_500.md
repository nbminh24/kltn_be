# Backend Bug Report - Analytics APIs Returning 500

**Date:** 2024-12-05  
**Reporter:** Frontend Team  
**Priority:** HIGH  
**Status:** New

---

## Problem Summary

Two analytics endpoints for Admin Product Detail are returning **500 Internal Server Error**:

1. `GET /api/v1/admin/products/:id/analytics/sales`
2. `GET /api/v1/admin/products/:id/analytics/variants`

---

## Error Details

### 1. Sales Trend API

**Endpoint:**
```
GET http://localhost:3001/api/v1/admin/products/6/analytics/sales?period=30days
```

**Status:** 500 Internal Server Error

**Expected Response Structure:**
```json
{
  "product_id": "6",
  "period": "30days",
  "total_revenue": 15000000,
  "total_units_sold": 150,
  "data": [
    {
      "date": "2024-12-01",
      "revenue": 500000,
      "units_sold": 5,
      "orders": 3
    }
  ]
}
```

**Frontend Call:**
```typescript
// app/admin/products/[id]/page.tsx:110
const response = await adminProductService.getProductSalesTrend(Number(id), salesPeriod);
```

---

### 2. Variants Analytics API

**Endpoint:**
```
GET http://localhost:3001/api/v1/admin/products/6/analytics/variants
```

**Status:** 500 Internal Server Error

**Expected Response Structure:**
```json
{
  "product_id": "6",
  "total_sold": 500,
  "variants": [
    {
      "variant_id": "123",
      "sku": "AO-001-M-BLACK",
      "size": "M",
      "color": "Black",
      "total_sold": 150,
      "revenue": 5000000,
      "percentage": 30,
      "current_stock": 50
    }
  ]
}
```

**Frontend Call:**
```typescript
// app/admin/products/[id]/page.tsx:121
const response = await adminProductService.getVariantsAnalytics(Number(id));
```

---

## Test Case

**Product ID:** 6  
**Product Name:** Áo Khoác Kaki Nam Sage Moss Sundaze Rush Form Loose

### Working Endpoints (for comparison):
- ✅ `GET /api/v1/admin/products/6` → 200 OK
- ✅ `GET /api/v1/admin/products/6/reviews` → 200 OK

### Failing Endpoints:
- ❌ `GET /api/v1/admin/products/6/analytics/sales?period=30days` → 500
- ❌ `GET /api/v1/admin/products/6/analytics/variants` → 500

---

## Possible Causes

1. **Database Query Errors:**
   - Missing JOINs with order_items, orders tables
   - Incorrect aggregation functions
   - Date range calculations failing

2. **Missing Error Handling:**
   - Unhandled exceptions in controller
   - Database connection issues
   - Invalid SQL syntax

3. **Data Issues:**
   - Product ID 6 might not have order history
   - Missing related data in order_items table
   - NULL values not handled properly

---

## Backend Action Items

### For Sales Trend Endpoint:

1. Check controller implementation:
```javascript
// Expected implementation
exports.getProductSalesTrend = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30days' } = req.query;
    
    // Calculate date range based on period
    // Query order_items joined with orders
    // Group by date, aggregate revenue and units_sold
    
    res.json({
      product_id: id,
      period,
      total_revenue: ...,
      total_units_sold: ...,
      data: [...]
    });
  } catch (error) {
    console.error('Sales trend error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

2. SQL Query Example:
```sql
SELECT 
  DATE(o.created_at) as date,
  SUM(oi.total) as revenue,
  SUM(oi.quantity) as units_sold,
  COUNT(DISTINCT o.id) as orders
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN product_variants pv ON oi.variant_id = pv.id
WHERE pv.product_id = ?
  AND o.status = 'completed'
  AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(o.created_at)
ORDER BY date DESC;
```

### For Variants Analytics Endpoint:

1. Check controller implementation:
```javascript
exports.getVariantsAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Query all variants for product
    // Calculate total_sold from order_items
    // Calculate revenue and percentage
    
    res.json({
      product_id: id,
      total_sold: ...,
      variants: [...]
    });
  } catch (error) {
    console.error('Variants analytics error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

2. SQL Query Example:
```sql
SELECT 
  pv.id as variant_id,
  pv.sku,
  s.name as size,
  c.name as color,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(SUM(oi.total), 0) as revenue,
  pv.stock_quantity as current_stock
FROM product_variants pv
LEFT JOIN sizes s ON pv.size_id = s.id
LEFT JOIN colors c ON pv.color_id = c.id
LEFT JOIN order_items oi ON oi.variant_id = pv.id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
WHERE pv.product_id = ?
GROUP BY pv.id, pv.sku, s.name, c.name, pv.stock_quantity
ORDER BY total_sold DESC;
```

---

## Testing Checklist

After fixing, please verify:

- [ ] Endpoint returns 200 status code
- [ ] Response matches expected JSON structure
- [ ] Period parameter works: 7days, 30days, 3months, 1year
- [ ] Handles products with no sales history (empty data arrays)
- [ ] Handles products with NULL values gracefully
- [ ] Error messages are informative (not just "Internal Server Error")
- [ ] Console logs show actual error details for debugging

---

## Frontend Impact

Until fixed, frontend will show empty states:
- Sales tab: "No sales data available"
- Variants tab: "No sales data available for variants"

Reviews tab and product detail are working correctly.

---

## Next Steps

1. Backend team: Check server logs for actual error messages
2. Backend team: Fix SQL queries and error handling
3. Backend team: Test with product ID 6 and other products
4. Frontend team: Re-test after backend deployment
5. Verify all analytics tabs display data correctly

---

## Related Files

**Backend (need fixes):**
- Controller: `/controllers/admin/productAnalyticsController.js` (or similar)
- Routes: `/routes/admin/products.js`
- Database queries/models

**Frontend (working correctly):**
- Component: `/app/admin/products/[id]/page.tsx`
- Service: `/lib/services/admin/productService.ts`
- API Client: `/lib/services/apiClient.ts`
