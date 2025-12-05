# 📋 API Endpoints Summary

> **Complete list of all 100+ endpoints**  
> **Generated:** December 5, 2025

---

## 🔐 Authentication & Authorization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Đăng ký tài khoản customer |
| GET | `/api/v1/auth/activate` | Public | Kích hoạt tài khoản (redirect) |
| POST | `/api/v1/auth/activate` | Public | Kích hoạt tài khoản (API) |
| POST | `/api/v1/auth/login` | Public | Đăng nhập customer |
| POST | `/api/v1/auth/google` | Public | Đăng nhập Google |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Customer | Đăng xuất |
| POST | `/api/v1/auth/forgot-password` | Public | Gửi email reset password |
| POST | `/api/v1/auth/verify-reset-token` | Public | Verify reset token |
| POST | `/api/v1/auth/reset-password` | Public | Reset password |
| POST | `/api/v1/admin/auth/login` | Public | Đăng nhập admin |
| GET | `/api/v1/admin/auth/me` | Admin | Profile admin |
| POST | `/api/v1/admin/auth/logout` | Admin | Đăng xuất admin |
| POST | `/api/v1/admin/auth/create` | Admin | Tạo admin mới |
| POST | `/api/v1/admin/auth/reset-password` | Admin | Reset password (auth) |
| POST | `/api/v1/admin/auth/public-reset-password` | Public | Reset password (public) |

---

## 📦 Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | Public | Danh sách sản phẩm (filter, search, sort) |
| GET | `/products/new-arrivals` | Public | Sản phẩm mới (30 ngày) |
| GET | `/products/on-sale` | Public | Sản phẩm đang sale |
| GET | `/products/featured` | Public | Sản phẩm nổi bật |
| GET | `/products/filters` | Public | Lấy filter options (colors, sizes, price range) |
| GET | `/products/attributes` | Public | Lấy danh sách attribute keys |
| GET | `/products/availability` | Public | Kiểm tra tồn kho (chatbot) |
| GET | `/products/:slug` | Public | Chi tiết sản phẩm theo slug |
| GET | `/products/id/:id` | Public | Chi tiết sản phẩm theo ID |
| GET | `/products/:productId/reviews` | Public | Reviews của sản phẩm |
| GET | `/products/:productId/related` | Public | Sản phẩm liên quan |
| POST | `/products/id/:id/notify` | Customer | Đăng ký nhận thông báo sản phẩm |

---

## 🏷️ Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | Public | Danh sách danh mục |
| GET | `/categories/:slug` | Public | Chi tiết danh mục |
| GET | `/admin/categories` | Admin | Danh sách danh mục (Admin) |
| POST | `/admin/categories` | Admin | Tạo danh mục |
| PUT | `/admin/categories/:id` | Admin | Cập nhật danh mục |
| DELETE | `/admin/categories/:id` | Admin | Xóa danh mục (soft delete) |

---

## 🎨 Colors & Sizes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/colors` | Public | Danh sách màu sắc |
| GET | `/sizes` | Public | Danh sách sizes |
| GET | `/admin/colors` | Admin | Quản lý màu (Admin) |
| POST | `/admin/colors` | Admin | Tạo màu |
| PUT | `/admin/colors/:id` | Admin | Cập nhật màu |
| DELETE | `/admin/colors/:id` | Admin | Xóa màu |
| GET | `/admin/sizes` | Admin | Quản lý sizes (Admin) |
| POST | `/admin/sizes` | Admin | Tạo size |
| PUT | `/admin/sizes/:id` | Admin | Cập nhật size |
| DELETE | `/admin/sizes/:id` | Admin | Xóa size |

---

## 🛒 Cart & Checkout

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | Customer | Xem giỏ hàng |
| POST | `/cart/items` | Customer | Thêm vào giỏ |
| PUT | `/cart/items/:id` | Customer | Cập nhật số lượng |
| DELETE | `/cart/items/:id` | Customer | Xóa khỏi giỏ |
| DELETE | `/cart/clear` | Customer | Xóa toàn bộ giỏ |
| POST | `/cart/apply-coupon` | Customer | Áp dụng coupon |
| POST | `/cart/merge` | Customer | Merge guest cart → customer cart |
| POST | `/api/v1/checkout` | Customer | Tạo đơn hàng |
| POST | `/api/v1/checkout/create-payment-url` | Customer | Tạo VNPAY payment URL |

---

## 📦 Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/orders` | Customer | Lịch sử đơn hàng |
| GET | `/orders/:id` | Customer | Chi tiết đơn hàng |
| GET | `/orders/:id/status-history` | Customer | Timeline trạng thái |
| POST | `/orders/:id/cancel` | Customer | Hủy đơn hàng |
| GET | `/orders/track` | Public | Tracking đơn (chatbot) |

---

## 👤 Account Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/account/profile` | Customer | Xem profile |
| PUT | `/account/profile` | Customer | Cập nhật profile |
| POST | `/account/change-password` | Customer | Đổi mật khẩu |
| GET | `/account/addresses` | Customer | Danh sách địa chỉ |
| POST | `/account/addresses` | Customer | Thêm địa chỉ |
| PUT | `/account/addresses/:id` | Customer | Cập nhật địa chỉ |
| DELETE | `/account/addresses/:id` | Customer | Xóa địa chỉ |
| POST | `/account/addresses/:id/set-default` | Customer | Đặt địa chỉ mặc định |

---

## ❤️ Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wishlist` | Customer | Danh sách wishlist |
| POST | `/wishlist` | Customer | Thêm vào wishlist |
| DELETE | `/wishlist/:variantId` | Customer | Xóa khỏi wishlist |
| DELETE | `/wishlist/clear` | Customer | Xóa toàn bộ wishlist |

---

## ⭐ Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reviews` | Customer | Tạo review sản phẩm |
| GET | `/reviews/my-reviews` | Customer | Reviews của tôi |
| PUT | `/reviews/:id` | Customer | Cập nhật review |
| DELETE | `/reviews/:id` | Customer | Xóa review |
| GET | `/admin/reviews` | Admin | Danh sách reviews (Admin) |
| PUT | `/admin/reviews/:id/approve` | Admin | Duyệt review |
| PUT | `/admin/reviews/:id/reject` | Admin | Từ chối review |
| DELETE | `/admin/reviews/:id` | Admin | Xóa review |

---

## 🎟️ Promotions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/promotions` | Public | Danh sách promotions |
| GET | `/promotions/:code` | Public | Chi tiết promotion |
| POST | `/promotions/validate` | Customer | Validate promotion code |
| GET | `/admin/promotions` | Admin | Quản lý promotions (Admin) |
| POST | `/admin/promotions` | Admin | Tạo promotion |
| PUT | `/admin/promotions/:id` | Admin | Cập nhật promotion |
| DELETE | `/admin/promotions/:id` | Admin | Xóa promotion |
| POST | `/admin/promotions/:id/toggle` | Admin | Bật/Tắt promotion |
| GET | `/admin/promotions/:code/usage` | Admin | Thống kê sử dụng |

---

## 🎫 Support Tickets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/support/tickets` | Customer | Danh sách tickets của tôi |
| GET | `/support/tickets/:id` | Customer | Chi tiết ticket |
| POST | `/support/tickets` | Customer | Tạo ticket |
| POST | `/support/tickets/:id/reply` | Customer | Trả lời ticket |
| GET | `/admin/support-tickets` | Admin | Danh sách tất cả tickets (Admin) |
| GET | `/admin/support-tickets/:id` | Admin | Chi tiết ticket (Admin) |
| PUT | `/admin/support-tickets/:id` | Admin | Cập nhật trạng thái ticket |
| POST | `/admin/support-tickets/:id/reply` | Admin | Admin trả lời ticket |

---

## 💬 Live Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chat/sessions` | Customer | Danh sách chat sessions |
| GET | `/chat/sessions/:id` | Customer | Chi tiết session |
| POST | `/chat/sessions` | Customer | Tạo chat session |
| POST | `/chat/sessions/:id/messages` | Customer | Gửi tin nhắn |
| POST | `/chat/sessions/:id/mark-read` | Customer | Đánh dấu đã đọc |
| POST | `/chat/sessions/merge` | Customer | Merge sessions sau khi login |
| GET | `/admin/chatbot/conversations` | Admin | Danh sách conversations (Admin) |
| GET | `/admin/chatbot/conversations/:id` | Admin | Chi tiết conversation |
| POST | `/admin/chat/:id/reply` | Admin | Admin reply chat |
| GET | `/admin/chatbot/analytics` | Admin | Analytics chatbot |
| GET | `/admin/chatbot/unanswered` | Admin | Conversations cần hỗ trợ |

---

## 🤖 AI Consultant

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/consultant/sizing-advice` | Public | Tư vấn size |
| POST | `/consultant/styling-advice` | Public | Tư vấn phối đồ |
| POST | `/consultant/compare-products` | Public | So sánh sản phẩm |
| POST | `/consultant/validate-mix` | Public | Kiểm tra mix&match |
| GET | `/consultant/recommendations/:customerId` | Customer | Sản phẩm gợi ý cho customer |

---

## 📊 Admin - Dashboard & Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard/stats` | Admin | Thống kê tổng quan |
| GET | `/admin/dashboard/recent-orders` | Admin | Đơn hàng gần đây |
| GET | `/admin/dashboard/top-products` | Admin | Sản phẩm bán chạy |
| GET | `/admin/dashboard/revenue-chart` | Admin | Biểu đồ doanh thu |
| GET | `/analytics/overview` | Admin | Analytics tổng quan |
| GET | `/analytics/products` | Admin | Analytics sản phẩm |
| GET | `/analytics/customers` | Admin | Analytics khách hàng |
| GET | `/analytics/revenue` | Admin | Analytics doanh thu |

---

## 🛍️ Admin - Products Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/products` | Admin | Danh sách sản phẩm (Admin) |
| GET | `/admin/products/:id` | Admin | Chi tiết sản phẩm (Admin) |
| POST | `/admin/products` | Admin | Tạo sản phẩm |
| PUT | `/admin/products/:id` | Admin | Cập nhật sản phẩm |
| DELETE | `/admin/products/:id` | Admin | Xóa sản phẩm (soft delete) |
| POST | `/admin/products/:id/restore` | Admin | Khôi phục sản phẩm |
| POST | `/admin/products/:productId/variants` | Admin | Tạo variant |
| PUT | `/admin/products/:productId/variants/:id` | Admin | Cập nhật variant |
| DELETE | `/admin/products/:productId/variants/:id` | Admin | Xóa variant |
| POST | `/admin/products/:productId/images` | Admin | Thêm ảnh |
| PUT | `/admin/products/:productId/images/:id` | Admin | Cập nhật ảnh |
| DELETE | `/admin/products/:productId/images/:id` | Admin | Xóa ảnh |
| POST | `/admin/products/:productId/images/:id/set-main` | Admin | Đặt ảnh chính |

---

## 📦 Admin - Orders Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/orders` | Admin | Danh sách tất cả đơn hàng |
| GET | `/admin/orders/statistics` | Admin | Thống kê đơn hàng |
| GET | `/admin/orders/:id` | Admin | Chi tiết đơn hàng |
| PUT | `/admin/orders/:id/status` | Admin | Cập nhật trạng thái |
| POST | `/admin/orders/:id/cancel` | Admin | Hủy đơn hàng (admin) |
| POST | `/admin/orders/:id/refund` | Admin | Hoàn tiền |

---

## 👥 Admin - Customers Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/customers` | Admin | Danh sách khách hàng |
| GET | `/admin/customers/statistics` | Admin | Thống kê khách hàng |
| GET | `/admin/customers/:id` | Admin | Chi tiết khách hàng |
| PUT | `/admin/customers/:id/status` | Admin | Cập nhật trạng thái (active/inactive) |
| GET | `/admin/customers/:id/orders` | Admin | Đơn hàng của khách |
| GET | `/admin/customers/:id/reviews` | Admin | Reviews của khách |

---

## 📦 Admin - Inventory Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/inventory` | Admin | Tình trạng tồn kho |
| POST | `/admin/inventory/restock` | Admin | Nhập kho thủ công |
| POST | `/admin/inventory/restock-batch` | Admin | Nhập kho qua Excel |
| GET | `/admin/inventory/restock-history` | Admin | Lịch sử nhập kho |
| GET | `/admin/inventory/low-stock` | Admin | Sản phẩm sắp hết hàng |

---

## 💳 Admin - Payment Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/transactions` | Admin | Danh sách giao dịch |
| GET | `/admin/transactions/:id` | Admin | Chi tiết giao dịch |
| GET | `/admin/transactions/statistics` | Admin | Thống kê giao dịch |

---

## 📄 Admin - CMS Pages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pages/:slug` | Public | Xem page (About, FAQ, Terms...) |
| GET | `/admin/pages` | Admin | Danh sách pages (Admin) |
| GET | `/admin/pages/:slug` | Admin | Chi tiết page (Admin) |
| PUT | `/admin/pages/:slug` | Admin | Cập nhật nội dung page |
| POST | `/admin/pages` | Admin | Tạo page mới |
| DELETE | `/admin/pages/:slug` | Admin | Xóa page |

---

## 🔔 Payment Callbacks (VNPAY)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/payment/vnpay-return` | Public | VNPAY return URL (redirect) |
| GET | `/api/v1/payment/vnpay-ipn` | Public | VNPAY IPN (webhook) |

---

## 🔍 Internal APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/internal/tickets/create` | Internal | Tạo ticket từ chatbot |
| POST | `/internal/notifications/subscribe` | Internal | Subscribe notification |
| POST | `/internal/sizing-advice` | Internal | AI sizing advice (internal) |

---

## 📊 Summary

### Total Endpoints: **120+**

#### By Authentication Type:
- **Public (no auth):** ~35 endpoints
- **Customer (JWT required):** ~40 endpoints  
- **Admin (JWT + Admin role):** ~45 endpoints
- **Internal (API key):** ~3 endpoints

#### By Module:
- **Authentication:** 16 endpoints
- **Products & Catalog:** 35 endpoints
- **Shopping (Cart, Checkout, Orders):** 15 endpoints
- **Customer Features:** 20 endpoints
- **Admin Management:** 40+ endpoints
- **Support & AI:** 18 endpoints
- **Analytics:** 8 endpoints

---

## 🔗 Related Documentation

- **[API_DOCUMENTATION_COMPLETE.md](./API_DOCUMENTATION_COMPLETE.md)** - Chi tiết từng API với request/response examples
- **[API_TECHNICAL_SPECIFICATION.md](./API_TECHNICAL_SPECIFICATION.md)** - Technical specs và business logic
- **[Database.md](./Database.md)** - Database schema
- **[README.md](./README.md)** - Setup và deployment guide

---

**Last Updated:** December 5, 2025  
**API Version:** v1  
**Base URL:** `https://api.yourshop.com` (Production) | `http://localhost:3000` (Development)
