# 🐛 BACKEND BUG REPORT - Promotions API 500 Error

**Date:** 2024-12-06  
**Priority:** HIGH  
**Status:** ❌ BLOCKING  
**Module:** Admin Promotions

---

## 📍 **ENDPOINT**

```
GET /api/v1/admin/promotions
```

**Expected:** 200 OK with promotions list  
**Actual:** 500 Internal Server Error

---

## 🔥 **ERROR DETAILS**

### **Frontend Call**
```typescript
// app/admin/promotions/page.tsx:32
const response = await adminPromotionService.getPromotions({
  status: activeTab,
  page: 1,
  limit: 100,
});
```

### **API Request**
```
GET http://localhost:3001/api/v1/admin/promotions?status=active&page=1&limit=100
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
  data: Promotion[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

---

## 🔍 **LIKELY CAUSES**

### **1. Missing Query Implementation**
Backend controller might not be implemented.

### **2. Database Relation Error**
Missing joins or relations in query.

### **3. PostgreSQL Syntax Error**
Date filtering or status filtering syntax error.

### **4. Missing Table/Entity**
Promotions table might not exist or entity not configured.

---

## 🛠️ **SUGGESTED BACKEND FIX**

```typescript
@Get()
@UseGuards(AdminJwtAuthGuard)
async getPromotions(
  @Query('status') status?: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  try {
    const query = this.promotionRepository
      .createQueryBuilder('promotion')
      .select([
        'promotion.id',
        'promotion.code',
        'promotion.name',
        'promotion.discount_type',
        'promotion.discount_value',
        'promotion.min_order_value',
        'promotion.max_discount',
        'promotion.start_date',
        'promotion.end_date',
        'promotion.usage_limit',
        'promotion.used_count',
        'promotion.status',
      ]);

    if (status) {
      query.where('promotion.status = :status', { status });
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('promotion.created_at', 'DESC')
      .getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Promotions query error:', error);
    throw new InternalServerErrorException('Failed to fetch promotions');
  }
}
```

---

## 📝 **TEMPORARY WORKAROUND**

Frontend needs graceful error handling to show empty state instead of crash.

---

**Report Created:** 2024-12-06  
**Severity:** HIGH - Blocks promotions module
