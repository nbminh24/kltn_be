# 🌱 Seed Data Guide

Hướng dẫn sử dụng scripts seed data cho project.

---

## 📋 Prerequisites

1. **Database đã được tạo và migration đã chạy**
2. **Thư mục `denim_official` chứa file Excel** với cấu trúc:
   - `name`: Tên sản phẩm
   - `description`: Mô tả sản phẩm
   - `image_urls`: JSON array chứa URLs ảnh

---

## 🚀 Cách sử dụng

### **1. Seed Data (Tạo data mẫu)**

```bash
npm run seed
```

Script này sẽ tạo:
- ✅ 3 Admin accounts
- ✅ 12 Categories (từ 12 file Excel)
- ✅ ~100+ Products (từ Excel)
- ✅ ~1500 Product Variants (5 sizes x 3 colors cho mỗi product)
- ✅ ~3000 Product Images (chia đều cho variants)
- ✅ 20 Customers
- ✅ 30 Orders với items, payments, status history
- ✅ 50 Product Reviews
- ✅ 20 Chat Sessions với messages
- ✅ 15 Support Tickets với replies
- ✅ 10 Carts với items
- ✅ Wishlist items
- ✅ 3 Promotions
- ✅ 5 Restock Batches
- ✅ Và nhiều hơn nữa...

**Thời gian chạy:** ~30-60 giây (tùy số lượng data trong Excel)

---

### **2. Clear Data (Xóa toàn bộ data)**

```bash
npm run clear-data
```

⚠️ **WARNING:** Script này sẽ **XÓA TOÀN BỘ DATA** trong database!

- Bạn sẽ được yêu cầu confirm bằng cách gõ `YES`
- Sau khi xóa, có thể chạy `npm run seed` để tạo data mới

---

## 🔑 Default Accounts

### **Admin Accounts:**

| Email | Password | Role |
|-------|----------|------|
| superadmin@shop.com | Admin123456 | super_admin |
| admin@shop.com | Admin123456 | admin |
| manager@shop.com | Admin123456 | admin |

### **Customer Accounts:**

| Email | Password |
|-------|----------|
| customer1@gmail.com | Customer123 |
| customer2@gmail.com | Customer123 |
| ... | Customer123 |
| customer20@gmail.com | Customer123 |

---

## 📁 Cấu trúc Excel Files

Trong folder `denim_official`, mỗi file Excel tương ứng với 1 category:

```
denim_official/
├── ao_khoac.xlsx
├── ao_ni.xlsx
├── ao_polo.xlsx
├── ao_somi.xlsx
├── ao_thun.xlsx
├── hoodies.xlsx
├── jogger.xlsx
├── quan_jean.xlsx
├── quan_kaki.xlsx
├── quan_short.xlsx
├── quan_tay.xlsx
└── tank_top_ao_ba_lo.xlsx
```

**Format Excel:**

| name | description | image_urls |
|------|-------------|------------|
| Quần Dài Kaki... | Mô tả sản phẩm... | ["url1", "url2", ...] |

---

## 🎯 Logic Seed

### **Products & Variants:**

- Mỗi product có **15 variants** = 5 sizes (S, M, L, XL, XXL) × 3 colors (random)
- Ảnh từ Excel được **chia đều** cho các variants
- Mỗi variant có ít nhất 1 ảnh

### **Orders:**

- Trạng thái: `pending`, `confirmed`, `shipping`, `delivered`, `cancelled`
- Payment: COD, VNPAY, MOMO
- Tạo ngẫu nhiên từ 0-60 ngày trước

### **Reviews:**

- Chỉ tạo cho đơn hàng đã `delivered`
- Rating: 4-5 sao
- Comment: Ngẫu nhiên từ danh sách có sẵn

---

## 🛠️ Troubleshooting

### **Lỗi: "Cannot find module 'xlsx'"**

```bash
npm install
```

### **Lỗi: "Database connection failed"**

Kiểm tra file `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=kltn_db
```

### **Lỗi: "Table does not exist"**

Chạy migration trước:
```bash
npm run migration:run
```

### **Muốn seed lại từ đầu:**

```bash
npm run clear-data   # Gõ YES để confirm
npm run seed         # Tạo data mới
```

---

## 📊 Kiểm tra kết quả

Sau khi seed xong, bạn có thể:

1. **Login Admin:** `superadmin@shop.com / Admin123456`
2. **Kiểm tra Products:** Vào trang quản lý sản phẩm
3. **Kiểm tra Orders:** Xem danh sách đơn hàng
4. **Test API:** Sử dụng Swagger hoặc Postman

---

## ⚙️ Tùy chỉnh

Nếu muốn thay đổi số lượng data, edit file `scripts/seed-data.ts`:

```typescript
// Số lượng customers
for (let i = 0; i < 20; i++) { ... }  // Thay 20 thành số khác

// Số lượng orders
for (let i = 0; i < 30; i++) { ... }  // Thay 30 thành số khác
```

---

**Happy Seeding! 🌱**
