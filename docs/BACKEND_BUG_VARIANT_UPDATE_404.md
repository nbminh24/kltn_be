# 🔴 BACKEND BUG REPORT: Variant Update API Not Found (404)

**Created:** 2024-12-06  
**Priority:** HIGH  
**Status:** BLOCKING Product Edit Feature  
**Module:** Admin Product Management - Variants

---

## 📋 Executive Summary

API endpoint `PUT /api/v1/admin/products/:productId/variants/:id` documented in API specs is **NOT IMPLEMENTED** in backend, causing all variant updates to fail with 404 errors.

---

## 🐛 Issue Details

### Error Information
- **HTTP Status:** 404 Not Found
- **Endpoint:** `PUT /api/v1/admin/products/:productId/variants/:id`
- **Authentication:** Bearer Token (Admin) - ✅ Working
- **Frequency:** 100% (All variant update attempts fail)

### Failing Requests
```
PUT http://localhost:3001/api/v1/admin/products/1/variants/1  → 404
PUT http://localhost:3001/api/v1/admin/products/1/variants/2  → 404
PUT http://localhost:3001/api/v1/admin/products/1/variants/3  → 404
...
PUT http://localhost:3001/api/v1/admin/products/1/variants/15 → 404
```

### Frontend Call Context
**File:** `app/admin/products/[id]/edit/page.tsx`
**Line:** 220

```typescript
// This fails for ALL existing variants
adminProductService.updateVariant(productId, variant.dbId, {
  total_stock: variant.stock,
  status: variant.enabled ? 'active' : 'inactive',
})
```

**Service Method:**
**File:** `lib/services/admin/productService.ts`
**Line:** 253-258

```typescript
updateVariant: async (productId: number, variantId: number, data: {
    total_stock?: number;
    status?: 'active' | 'inactive';
}): Promise<AxiosResponse<any>> => {
    return apiClient.put(`/api/v1/admin/products/${productId}/variants/${variantId}`, data);
},
```

---

## 📖 Expected Implementation (From API Docs)

### Endpoint
```
PUT /api/v1/admin/products/:productId/variants/:id
```

### Authentication
- **Required:** Bearer Token (Admin role)

### Request Body
```json
{
  "total_stock": 150,
  "status": "active"
}
```

### Allowed Updates
- ✅ `total_stock` (number, >= 0)
- ✅ `status` ('active' or 'inactive')
- ❌ `sku` (CANNOT be changed)
- ❌ `size_id` (CANNOT be changed)
- ❌ `color_id` (CANNOT be changed)

### Expected Response (200 OK)
```json
{
  "message": "Cập nhật variant thành công",
  "variant": {
    "id": 201,
    "sku": "ASM-001-M-TRA",
    "total_stock": 150,
    "available_stock": 145,
    "status": "active"
  }
}
```

---

## 🔧 Backend Implementation Required

### 1. Route Definition
**File:** `routes/admin/products.js` (hoặc tương tự)

```javascript
router.put('/products/:productId/variants/:id', 
  authenticateToken,
  requireAdmin,
  updateVariant
);
```

### 2. Controller Method
**File:** `controllers/admin/productController.js`

```javascript
const updateVariant = async (req, res) => {
  try {
    const { productId, id: variantId } = req.params;
    const { total_stock, status } = req.body;

    // Validate product exists and belongs to admin's scope
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Validate variant exists and belongs to product
    const variant = await ProductVariant.findOne({
      where: { 
        id: variantId,
        product_id: productId 
      }
    });

    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    // Validate input
    if (total_stock !== undefined) {
      if (typeof total_stock !== 'number' || total_stock < 0) {
        return res.status(400).json({ message: 'Invalid total_stock value' });
      }
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
    }

    // Update variant
    const updateData = {};
    if (total_stock !== undefined) updateData.total_stock = total_stock;
    if (status !== undefined) updateData.status = status;

    await variant.update(updateData);

    // Return updated variant
    return res.status(200).json({
      message: 'Cập nhật variant thành công',
      variant: {
        id: variant.id,
        sku: variant.sku,
        total_stock: variant.total_stock,
        available_stock: variant.available_stock,
        status: variant.status
      }
    });

  } catch (error) {
    console.error('Error updating variant:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
```

### 3. Database Table
**Table:** `product_variants`

Required columns:
```sql
id INT PRIMARY KEY
product_id INT (FK to products)
size_id INT (FK to sizes)
color_id INT (FK to colors)
sku VARCHAR(100) UNIQUE
total_stock INT DEFAULT 0
available_stock INT DEFAULT 0
status ENUM('active', 'inactive') DEFAULT 'active'
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP (soft delete)
```

---

## 🧪 Test Cases

### Test 1: Update Stock
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"total_stock": 200}'
```
**Expected:** 200 OK with updated variant

### Test 2: Update Status
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```
**Expected:** 200 OK with updated variant

### Test 3: Update Both
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"total_stock": 150, "status": "active"}'
```
**Expected:** 200 OK with updated variant

### Test 4: Invalid Variant ID
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/99999 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"total_stock": 100}'
```
**Expected:** 404 Not Found

### Test 5: Variant Not Belong to Product
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/50 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"total_stock": 100}'
```
(Assuming variant 50 belongs to product 2, not product 1)
**Expected:** 404 Not Found

### Test 6: Invalid Stock Value
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"total_stock": -10}'
```
**Expected:** 400 Bad Request

### Test 7: Invalid Status Value
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "deleted"}'
```
**Expected:** 400 Bad Request

### Test 8: Unauthorized Access
```bash
curl -X PUT http://localhost:3001/api/v1/admin/products/1/variants/1 \
  -H "Content-Type: application/json" \
  -d '{"total_stock": 100}'
```
**Expected:** 401 Unauthorized

---

## 📊 Impact Analysis

### Current Impact
- ❌ Admin **CANNOT** update variant stock levels
- ❌ Admin **CANNOT** activate/deactivate variants
- ❌ Product Edit page is **PARTIALLY BROKEN**
- ✅ Product info update still works
- ✅ Creating NEW variants works (if POST endpoint exists)

### Business Impact
- **Inventory Management:** Broken - Cannot adjust stock levels
- **Product Availability:** Broken - Cannot enable/disable variants
- **Admin Workflow:** Blocked - Requires manual database updates

### User Experience
- Users see error message when trying to save variant changes
- Confusing UX - Some data saves, some doesn't

---

## ✅ Acceptance Criteria

1. ✅ Endpoint responds with 200 OK for valid requests
2. ✅ `total_stock` updates correctly in database
3. ✅ `status` updates correctly in database
4. ✅ Returns updated variant data in response
5. ✅ Validates variant belongs to specified product
6. ✅ Returns 404 for non-existent variants
7. ✅ Returns 400 for invalid input
8. ✅ Requires admin authentication
9. ✅ Prevents updating immutable fields (sku, size_id, color_id)
10. ✅ All test cases pass

---

## 🔗 Related Issues

- **Related API:** `POST /api/v1/admin/products/:productId/variants` (Create variant)
- **Related API:** `DELETE /api/v1/admin/products/:productId/variants/:id` (Delete variant)
- **Frontend Issue:** Product Edit page cannot save variant changes

---

## 📝 Notes

1. **Priority:** This is a HIGH priority issue as it blocks core admin functionality
2. **Workaround:** Currently NO workaround - manual database updates required
3. **Frontend Status:** Frontend code is complete and ready - just waiting for backend
4. **Documentation:** API endpoint is documented but not implemented

---

**Reported by:** Frontend Team  
**Assigned to:** Backend Team  
**Next Action:** Implement endpoint following specifications above
