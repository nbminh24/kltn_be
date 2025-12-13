# 🐛 BACKEND BUG REPORT: Order Detail API Missing Product Data

**Date:** 2025-12-13  
**Reporter:** Frontend Team  
**Priority:** HIGH  
**Status:** ❌ NEEDS FIX

---

## 📋 Summary

The `GET /orders/{id}` endpoint returns incomplete product information in order items. Critical fields like product images, size names, color names, and full product details are missing, forcing the frontend to display fallback data or "N/A" values.

---

## 🔴 Current Behavior

### API Response Structure
```json
{
  "order": {
    "id": 32,
    "items": [
      {
        "id": 80,
        "variant_id": "15",
        "quantity": 1,
        "price_at_purchase": "12.72",
        "variant": {
          "id": "15",
          "product_id": "1",
          "size_id": "3",      // ❌ Only ID, no size object
          "color_id": "3",     // ❌ Only ID, no color object
          "sku": "TNO-1-BLACK-L-271",
          "name": "relaxed-fit-t-shirt: Original Summer - Black - L"
          // ❌ NO product object
          // ❌ NO image_url
        }
        // ❌ NO thumbnail_url
        // ❌ NO product_name (have to fallback to variant.name)
      }
    ]
  }
}
```

---

## ✅ Expected Behavior

The order detail endpoint should populate full relations for display purposes:

```json
{
  "order": {
    "id": 32,
    "items": [
      {
        "id": 80,
        "variant_id": "15",
        "quantity": 1,
        "price_at_purchase": "12.72",
        "product_name": "Áo Thun Relaxed Fit Original Summer",
        "thumbnail_url": "https://res.cloudinary.com/.../image.png",
        "variant": {
          "id": "15",
          "product_id": "1",
          "size_id": "3",
          "color_id": "3",
          "sku": "TNO-1-BLACK-L-271",
          "name": "relaxed-fit-t-shirt: Original Summer - Black - L",
          "size": {                    // ✅ Populate size object
            "id": 3,
            "name": "L"
          },
          "color": {                   // ✅ Populate color object
            "id": 3,
            "name": "Đen"
          },
          "product": {                 // ✅ Populate product object
            "id": "1",
            "name": "Áo Thun Relaxed Fit Original Summer",
            "thumbnail_url": "https://res.cloudinary.com/.../image.png",
            "images": [
              {
                "id": 1,
                "url": "https://res.cloudinary.com/.../image.png"
              }
            ]
          }
        }
      }
    ]
  }
}
```

---

## 💥 Impact

1. **Product Images**: Frontend has to use default placeholder image (`/bmm32410_black_xl.webp`) instead of actual product images
2. **Size Display**: Shows "N/A" instead of actual size name (e.g., "L", "XL")
3. **Color Display**: Shows "N/A" instead of actual color name (e.g., "Đen", "Trắng")
4. **Performance**: Frontend has to make additional API calls to `/api/v1/sizes/all` and `/api/v1/colors/all` to map IDs to names
5. **User Experience**: Order detail page shows incomplete information

---

## 🔧 Required Changes

### Backend (NestJS/TypeORM)

In your order service, when returning order details, ensure proper relations are loaded:

```typescript
// orders.service.ts
async findOne(id: number, customerId: number) {
  const order = await this.orderRepository.findOne({
    where: { id, customer_id: customerId },
    relations: [
      'items',
      'items.variant',
      'items.variant.size',      // ✅ Add this
      'items.variant.color',     // ✅ Add this
      'items.variant.product',   // ✅ Add this
      'items.variant.product.images'  // ✅ Add this
    ]
  });

  // Transform items to include direct fields
  if (order && order.items) {
    order.items = order.items.map(item => ({
      ...item,
      product_name: item.variant?.product?.name || item.variant?.name,
      thumbnail_url: item.variant?.product?.thumbnail_url || 
                     item.variant?.product?.images?.[0]?.url
    }));
  }

  return order;
}
```

---

## 📝 Checklist

- [ ] Add `size` relation to order item variant query
- [ ] Add `color` relation to order item variant query
- [ ] Add `product` relation to order item variant query
- [ ] Add `product.images` nested relation
- [ ] Include `product_name` in order item response
- [ ] Include `thumbnail_url` in order item response
- [ ] Test with frontend to verify all data displays correctly
- [ ] Update API documentation

---

## 🧪 Test Case

**Endpoint:** `GET /orders/32`  
**Headers:** `Authorization: Bearer {token}`

**Expected:**
- Each order item should have `product_name` and `thumbnail_url`
- Each `variant` should have `size`, `color`, and `product` objects populated
- Product images should be available via `variant.product.images` array

---

## 📊 References

- Frontend code: `c:\Users\USER\Downloads\kltn_fe\app\orders\[id]\page.tsx`
- Similar working endpoints: 
  - `GET /cart` (returns full variant data with size/color/product)
  - `GET /products/{id}` (returns full product with variants)

---

## 🎯 Success Criteria

✅ Order detail page displays:
- Actual product images (not placeholder)
- Size names (e.g., "L", "XL", not "N/A")
- Color names (e.g., "Đen", "Trắng", not "N/A")
- No additional API calls needed to fetch sizes/colors

---

**Please fix ASAP as this affects user experience on order tracking.**
