# 🐛 BUG REPORT: Product Filter - Missing Rating Parameter

**Ngày tạo:** 13/12/2025  
**Người báo cáo:** Frontend Team (QA)  
**Độ ưu tiên:** Medium  
**Module:** Products & Catalog API

---

## 📋 Mô tả vấn đề

API `GET /api/v1/products` hiện tại **KHÔNG hỗ trợ filter theo rating** của sản phẩm. Frontend đã implement UI cho rating filter (cho phép user chọn sản phẩm có rating từ 1-5 sao), nhưng backend API không có parameter tương ứng để xử lý filter này.

---

## 🎯 Yêu cầu

Cần thêm parameter **`min_rating`** vào API `GET /api/v1/products` để cho phép filter sản phẩm theo rating tối thiểu.

---

## 📥 API Request Mong Muốn

### Endpoint
```
GET /api/v1/products
```

### Query Parameters (Cần bổ sung)

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `min_rating` | number | ❌ | Filter sản phẩm có average_rating >= giá trị này | `4` (chỉ lấy sản phẩm 4⭐ trở lên) |

### Request Example
```
GET /api/v1/products?page=1&limit=20&min_rating=4
```

Khi user chọn "4 stars & up" → gửi `min_rating=4`  
Khi user chọn "5 stars" → gửi `min_rating=5`

---

## 📤 Expected Response

Response giống như hiện tại, nhưng chỉ trả về sản phẩm có `average_rating >= min_rating`

```json
{
  "products": [
    {
      "id": 1,
      "name": "Áo Sơ Mi Premium",
      "average_rating": 4.5,
      "total_reviews": 120,
      ...
    },
    {
      "id": 2,
      "name": "Áo Polo Classic",
      "average_rating": 4.8,
      "total_reviews": 95,
      ...
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

## 🔄 Logic Backend Cần Implement

```sql
SELECT * FROM products
WHERE status = 'active'
  AND average_rating >= :min_rating  -- Thêm điều kiện này
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

---

## 💻 Frontend Implementation (Đã sẵn sàng)

Frontend đã có UI cho rating filter:
- User có thể chọn multi-select: 5⭐, 4⭐, 3⭐, 2⭐, 1⭐
- UI hiển thị "X stars & up"
- State `selectedRatings` đã được setup

**Frontend chỉ cần backend hỗ trợ parameter `min_rating` là có thể hoạt động ngay.**

---

## 🎨 UI Reference

```
☑ 5 ★★★★★ & up
☐ 4 ★★★★☆ & up  
☐ 3 ★★★☆☆ & up
☐ 2 ★★☆☆☆ & up
☐ 1 ★☆☆☆☆ & up
```

Khi user chọn nhiều rating (ví dụ: 4⭐ và 5⭐), frontend sẽ gửi `min_rating` là giá trị nhỏ nhất được chọn.

**Ví dụ:**
- Chọn [5⭐] → `min_rating=5`
- Chọn [4⭐, 5⭐] → `min_rating=4`
- Chọn [3⭐, 4⭐, 5⭐] → `min_rating=3`

---

## 📊 Tài liệu tham khảo

Tham khảo API spec hiện tại: `docs/API_02_PRODUCTS_CATALOG.md`

### Current Parameters (Line 74-84)
```
| `page` | number | ❌ | Trang hiện tại (default: 1) | `1` |
| `limit` | number | ❌ | Số sản phẩm/trang (default: 20) | `20` |
| `category_slug` | string | ❌ | Filter theo danh mục | `ao-so-mi` |
| `colors` | string | ❌ | Filter theo màu (IDs, comma-separated) | `1,2` |
| `sizes` | string | ❌ | Filter theo size (IDs, comma-separated) | `M,L,XL` |
| `min_price` | number | ❌ | Giá tối thiểu | `100000` |
| `max_price` | number | ❌ | Giá tối đa | `500000` |
| `search` | string | ❌ | Tìm kiếm theo tên hoặc mô tả | `áo sơ mi` |
| `sort_by` | string | ❌ | Sắp xếp | `newest` |
```

**Cần thêm:**
```
| `min_rating` | number | ❌ | Rating tối thiểu (1-5) | `4` |
```

---

## ✅ Acceptance Criteria

- [ ] Backend API hỗ trợ parameter `min_rating`
- [ ] Validate `min_rating` phải trong khoảng 0-5
- [ ] Filter hoạt động chính xác với `average_rating >= min_rating`
- [ ] Kết hợp tốt với các filter khác (category, price, colors, sizes)
- [ ] Performance tốt (index trên `average_rating` nếu cần)
- [ ] Update API documentation

---

## 🚀 Priority Justification

**Medium Priority** vì:
- User experience: Rating là tiêu chí quan trọng khi mua hàng
- Đã có data: `average_rating` đã có sẵn trong database
- Frontend ready: UI đã implement xong, chỉ đợi backend
- Dễ implement: Chỉ cần thêm 1 WHERE condition

---

## 📝 Notes

- Hiện tại frontend đã implement rating filter UI nhưng **chưa kết nối với API** vì thiếu parameter
- Sau khi backend implement xong, frontend chỉ cần uncomment code gọi API với `min_rating` parameter
- Nếu `min_rating` không được truyền → không filter theo rating (behavior mặc định)

---

**Liên hệ:** Frontend Team  
**Status:** Waiting for Backend Implementation
