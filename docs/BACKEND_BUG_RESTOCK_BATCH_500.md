# 🐛 BACKEND BUG REPORT - Restock Batch 500 Error

**Date:** 2024-12-06  
**Priority:** HIGH  
**Status:** ❌ BLOCKING  
**Module:** Inventory Restock

---

## 📍 **ENDPOINT**

```
POST /admin/inventory/restock-batch
```

**Expected:** 200 OK with batch creation result  
**Actual:** 500 Internal Server Error

---

## 🔥 **ERROR DETAILS**

### **Frontend Request** ✅ CORRECT
```typescript
// Request payload
{
  admin_id: 1,
  type: "Manual",
  items: [
    {
      variant_id: 123, // Example variant ID
      quantity: 50
    }
  ]
}
```

### **Backend Response** ❌ ERROR
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

### **Console Logs**
```
📦 Creating restock batch... {admin_id: 1, type: 'Manual', items: Array(1)}
🌐 API Request: POST http://localhost:3001/admin/inventory/restock-batch
🔐 Token attached: eyJhbGciOiJIUzI1NiIs...
❌ POST http://localhost:3001/admin/inventory/restock-batch 500 (Internal Server Error)
Response: {statusCode: 500, message: 'Internal server error'}
```

---

## 📊 **EXPECTED RESPONSE**

```json
{
  "batch_id": 789,
  "success_count": 1,
  "error_count": 0,
  "errors": []
}
```

---

## 🔍 **LIKELY CAUSES**

### **1. Missing Endpoint Implementation**
Backend might not have implemented this endpoint yet.

### **2. Database Transaction Error**
```typescript
// Possible issue in backend
async createRestockBatch(data: CreateRestockBatchDto) {
  // Transaction might be failing
  await this.connection.transaction(async (manager) => {
    // Creating restock batch record
    const batch = await manager.save(RestockBatch, {
      admin_id: data.admin_id,
      type: data.type,
    });
    
    // Updating inventory for each item
    for (const item of data.items) {
      // This might be throwing an error
      await manager.increment(
        ProductVariant,
        { id: item.variant_id },
        'total_stock',
        item.quantity
      );
    }
  });
}
```

### **3. Missing Relations**
- `RestockBatch` entity might not exist
- `admin_id` foreign key might not be set up
- `variant_id` might not exist in database

### **4. Validation Error**
```typescript
// DTO validation might be too strict
export class CreateRestockBatchDto {
  @IsNumber()
  admin_id: number;
  
  @IsEnum(['Manual', 'Auto'])
  type: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  items: RestockItemDto[];
}
```

---

## 🛠️ **SUGGESTED BACKEND FIX**

### **Controller**
```typescript
@Post('restock-batch')
@UseGuards(AdminJwtAuthGuard)
async createRestockBatch(
  @Body() data: CreateRestockBatchDto,
  @Req() request: any,
) {
  try {
    console.log('📦 Restock batch request:', data);
    
    // Validate admin exists
    const admin = await this.adminRepository.findOne({
      where: { id: data.admin_id }
    });
    
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }
    
    // Create batch
    const result = await this.inventoryService.createRestockBatch(data);
    
    return {
      batch_id: result.id,
      success_count: result.success_count,
      error_count: result.error_count,
      errors: result.errors || [],
    };
  } catch (error) {
    console.error('❌ Restock batch error:', error);
    
    // Return specific error message
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    throw new InternalServerErrorException({
      message: error.message || 'Failed to create restock batch',
      details: error.toString(),
    });
  }
}
```

### **Service**
```typescript
async createRestockBatch(data: CreateRestockBatchDto) {
  return await this.connection.transaction(async (manager) => {
    // 1. Create batch record
    const batch = await manager.save('restock_batches', {
      admin_id: data.admin_id,
      type: data.type,
      created_at: new Date(),
    });
    
    let success_count = 0;
    let error_count = 0;
    const errors = [];
    
    // 2. Process each item
    for (const item of data.items) {
      try {
        // Check if variant exists
        const variant = await manager.findOne('product_variants', {
          where: { id: item.variant_id }
        });
        
        if (!variant) {
          errors.push({
            variant_id: item.variant_id,
            message: 'Variant not found'
          });
          error_count++;
          continue;
        }
        
        // Update stock
        await manager.increment(
          'product_variants',
          { id: item.variant_id },
          'total_stock',
          item.quantity
        );
        
        // Create history record
        await manager.save('inventory_history', {
          variant_id: item.variant_id,
          batch_id: batch.id,
          change_type: 'restock',
          quantity_change: item.quantity,
          previous_stock: variant.total_stock,
          new_stock: variant.total_stock + item.quantity,
          created_at: new Date(),
        });
        
        success_count++;
      } catch (err) {
        console.error(`Error restocking variant ${item.variant_id}:`, err);
        errors.push({
          variant_id: item.variant_id,
          message: err.message
        });
        error_count++;
      }
    }
    
    return {
      id: batch.id,
      success_count,
      error_count,
      errors,
    };
  });
}
```

---

## 📝 **REQUEST EXAMPLE**

### **Valid Request**
```bash
curl -X POST http://localhost:3001/admin/inventory/restock-batch \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": 1,
    "type": "Manual",
    "items": [
      {
        "variant_id": 123,
        "quantity": 50
      }
    ]
  }'
```

### **Expected Success Response**
```json
{
  "batch_id": 789,
  "success_count": 1,
  "error_count": 0,
  "errors": []
}
```

### **Expected Partial Success Response**
```json
{
  "batch_id": 790,
  "success_count": 1,
  "error_count": 1,
  "errors": [
    {
      "variant_id": 999,
      "message": "Variant not found"
    }
  ]
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
```

### **inventory_history Table**
```sql
CREATE TABLE inventory_history (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES product_variants(id),
  batch_id INTEGER REFERENCES restock_batches(id),
  change_type VARCHAR(20) CHECK (change_type IN ('restock', 'sale', 'return', 'adjustment')),
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  created_by INTEGER REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ **VERIFICATION STEPS**

After backend fix:

1. **Check backend logs** for the actual error
2. **Verify database tables** exist
3. **Test with valid variant_id**:
   ```sql
   SELECT id, sku, total_stock FROM product_variants LIMIT 5;
   ```
4. **Test endpoint directly** with curl
5. **Check transaction rollback** works on error
6. **Verify inventory updated** after success

---

## 📝 **FRONTEND STATUS**

### **✅ Frontend Ready**
- ✅ Correct endpoint URL
- ✅ Correct request format
- ✅ Proper error handling
- ✅ Good logging
- ✅ User feedback

### **⏳ Waiting for Backend**
The frontend is fully implemented and ready. Just waiting for backend to:
1. Implement the endpoint
2. Create necessary database tables
3. Handle transaction properly

---

## 🎯 **IMPACT**

### **Current State**
- ❌ Cannot restock inventory manually
- ❌ Cannot create restock batches
- ❌ Blocks inventory management workflow

### **After Fix**
- ✅ Manual restock works
- ✅ Batch operations work
- ✅ Inventory history tracked
- ✅ Admin workflow complete

**Severity:** HIGH - Blocks critical inventory feature

---

## 🚀 **PRIORITY**

**Priority: HIGH**

This is a core inventory management feature needed for:
- Warehouse operations
- Stock management
- Order fulfillment
- Business operations

**Recommendation:** Fix ASAP to enable inventory management.

---

**Report Created:** 2024-12-06 23:17  
**Reported By:** Frontend Team  
**Assigned To:** Backend Team  
**Status:** Backend implementation needed
