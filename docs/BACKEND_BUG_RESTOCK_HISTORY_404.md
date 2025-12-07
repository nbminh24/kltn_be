# 🐛 BACKEND BUG REPORT - Restock History API 404 Error

**Date:** 2024-12-06  
**Priority:** MEDIUM  
**Status:** ❌ BLOCKING  
**Module:** Inventory Restock History

---

## 📍 **ENDPOINT**

```
GET /admin/inventory/restock-history
```

**Expected:** 200 OK with restock batches list  
**Actual:** 404 Not Found

---

## 🔥 **ERROR DETAILS**

### **Frontend Call**
```typescript
// app/admin/inventory/history/page.tsx:36
const response = await adminInventoryService.getRestockHistory({
  page: 1,
  limit: 20,
});
```

### **API Request**
```
GET http://localhost:3001/admin/inventory/restock-history?page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### **Error Response**
```
Status: 404 Not Found
Message: Resource not found
```

---

## 📊 **EXPECTED RESPONSE**

```json
{
  "batches": [
    {
      "id": 1,
      "admin_id": 1,
      "admin_name": "Admin User",
      "type": "Manual",
      "items_count": 3,
      "created_at": "2024-12-06T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

## 🔍 **LIKELY CAUSES**

### **1. Endpoint Not Implemented**
The backend route for restock history does not exist yet.

### **2. Wrong Route Pattern**
Backend might use a different URL pattern:
- `/admin/inventory/restock/history` (with slash) instead of `/admin/inventory/restock-history` (with dash)
- `/admin/inventory/batches`
- `/admin/restock-history`

---

## 🛠️ **SUGGESTED BACKEND IMPLEMENTATION**

### **Controller**
```typescript
@Get('restock-history')
@UseGuards(AdminJwtAuthGuard)
async getRestockHistory(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
  @Query('type') type?: string,
  @Query('start_date') startDate?: string,
  @Query('end_date') endDate?: string,
) {
  try {
    console.log('📦 Fetching restock history:', { page, limit, type });

    const skip = (page - 1) * limit;

    const query = this.restockBatchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.admin', 'admin')
      .select([
        'batch.id',
        'batch.admin_id',
        'batch.type',
        'batch.created_at',
        'admin.id',
        'admin.name',
      ])
      .orderBy('batch.created_at', 'DESC');

    // Filter by type if provided
    if (type) {
      query.andWhere('batch.type = :type', { type });
    }

    // Filter by date range
    if (startDate) {
      query.andWhere('batch.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('batch.created_at <= :endDate', { endDate });
    }

    const [batches, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Get items count for each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (batch) => {
        const itemsCount = await this.restockItemRepository.count({
          where: { batch_id: batch.id },
        });

        return {
          id: batch.id,
          admin_id: batch.admin_id,
          admin_name: batch.admin?.name || null,
          type: batch.type,
          created_at: batch.created_at,
          items_count: itemsCount,
        };
      })
    );

    return {
      batches: batchesWithCount,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  } catch (error) {
    console.error('❌ Restock history query error:', error);
    throw new InternalServerErrorException('Failed to fetch restock history');
  }
}
```

### **Route Registration**
```typescript
// inventory.controller.ts
@Controller('admin/inventory')
export class InventoryController {
  
  @Get('restock-history')
  getRestockHistory(@Query() params) {
    return this.inventoryService.getRestockHistory(params);
  }
}
```

---

## 🔗 **DATABASE SCHEMA NEEDED**

### **restock_batches Table**
```sql
CREATE TABLE restock_batches (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id),
  type VARCHAR(20) CHECK (type IN ('Manual', 'Auto')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_restock_batches_admin ON restock_batches(admin_id);
CREATE INDEX idx_restock_batches_created ON restock_batches(created_at DESC);
```

### **restock_items Table**
```sql
CREATE TABLE restock_items (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES restock_batches(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_restock_items_batch ON restock_items(batch_id);
CREATE INDEX idx_restock_items_variant ON restock_items(variant_id);
```

---

## 📝 **REQUEST EXAMPLES**

### **Basic Request**
```bash
curl -X GET "http://localhost:3001/admin/inventory/restock-history?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

### **With Type Filter**
```bash
curl -X GET "http://localhost:3001/admin/inventory/restock-history?page=1&limit=20&type=Manual" \
  -H "Authorization: Bearer TOKEN"
```

### **With Date Range**
```bash
curl -X GET "http://localhost:3001/admin/inventory/restock-history?page=1&limit=20&start_date=2024-12-01&end_date=2024-12-06" \
  -H "Authorization: Bearer TOKEN"
```

---

## 📊 **RESPONSE EXAMPLES**

### **Success Response**
```json
{
  "batches": [
    {
      "id": 5,
      "admin_id": 1,
      "admin_name": "Admin User",
      "type": "Manual",
      "items_count": 3,
      "created_at": "2024-12-06T10:30:00Z"
    },
    {
      "id": 4,
      "admin_id": 2,
      "admin_name": "John Doe",
      "type": "Auto",
      "items_count": 5,
      "created_at": "2024-12-05T14:20:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

### **Empty Response**
```json
{
  "batches": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

---

## ✅ **VERIFICATION STEPS**

After implementing:

1. **Check endpoint exists**
   ```bash
   curl -X GET "http://localhost:3001/admin/inventory/restock-history"
   ```

2. **Verify database tables**
   ```sql
   SELECT * FROM restock_batches LIMIT 5;
   SELECT * FROM restock_items LIMIT 5;
   ```

3. **Test with pagination**
   ```bash
   # Page 1
   curl -X GET "http://localhost:3001/admin/inventory/restock-history?page=1&limit=10"
   
   # Page 2
   curl -X GET "http://localhost:3001/admin/inventory/restock-history?page=2&limit=10"
   ```

4. **Test filters**
   ```bash
   # Manual only
   curl -X GET "http://localhost:3001/admin/inventory/restock-history?type=Manual"
   
   # Auto only
   curl -X GET "http://localhost:3001/admin/inventory/restock-history?type=Auto"
   ```

---

## 📝 **FRONTEND STATUS**

### **✅ Frontend Ready**
- ✅ Correct endpoint URL
- ✅ Proper error handling (404 handled gracefully)
- ✅ Loading states
- ✅ Empty states
- ✅ Pagination UI
- ✅ User feedback

### **⏳ Waiting for Backend**
The frontend is fully implemented and ready. Just waiting for backend to:
1. Implement the endpoint
2. Create database tables (if not exists)
3. Return data in expected format

---

## 🎯 **IMPACT**

### **Current State**
- ❌ Cannot view restock history
- ❌ Cannot audit restock operations
- ❌ Cannot track who restocked what

### **After Fix**
- ✅ View all restock batches
- ✅ Filter by type (Manual/Auto)
- ✅ Filter by date range
- ✅ Track admin actions
- ✅ Audit trail for inventory changes

**Severity:** MEDIUM - Non-blocking but important for auditing

---

## 🔗 **RELATED APIs**

This API should work together with:

1. **Create Restock Batch** (also needs fixing)
   ```
   POST /admin/inventory/restock-batch
   Status: 500 Error
   ```

2. **Inventory List** (working!)
   ```
   GET /admin/inventory
   Status: ✅ Working
   ```

---

## 🚀 **PRIORITY**

**Priority: MEDIUM**

This is an important auditing feature for:
- Inventory tracking
- Admin accountability
- Historical data
- Compliance

**Recommendation:** Implement after fixing the critical restock-batch POST endpoint.

---

## 📚 **API DOCUMENTATION REFERENCE**

**Source:** `docs/API_06_ADMIN_MANAGEMENT.md` Line 566

```markdown
### GET `/admin/inventory/restock-history`
**Lịch sử nhập kho**
```

**Note:** Documentation exists but endpoint not implemented yet.

---

**Report Created:** 2024-12-06 23:35  
**Reported By:** Frontend Team  
**Assigned To:** Backend Team  
**Status:** Endpoint not implemented - needs development
