# SCREENS AND API TECHNICAL SPECIFICATION

## 1. CUSTOMER SIDE

### 1.1. Authentication & Account

#### Screen: Login
- **GET** `/api/auth/customer/session` - Kiểm tra session hiện tại
- **POST** `/api/auth/customer/login` - Login với email/password
  - Request: `{ email, password }`
  - Response: `{ access_token, refresh_token, customer }`

#### Screen: Register
- **POST** `/api/auth/customer/register` - Đăng ký tài khoản mới
  - Request: `{ name, email, password }`
  - Response: `{ customer_id, email }`

#### Screen: Forgot Password
- **POST** `/api/auth/customer/forgot-password` - Gửi email reset password
  - Request: `{ email }`
- **POST** `/api/auth/customer/reset-password` - Reset password với token
  - Request: `{ token, new_password }`

#### Screen: Profile Management
- **GET** `/api/customers/me` - Lấy thông tin customer hiện tại
- **PUT** `/api/customers/me` - Cập nhật thông tin cá nhân
  - Request: `{ name, email }`
- **PUT** `/api/customers/me/password` - Đổi mật khẩu
  - Request: `{ current_password, new_password }`

### 1.2. Product Browsing

#### Screen: Homepage
- **GET** `/api/products/featured` - Lấy sản phẩm nổi bật
  - Query: `?limit=10`
- **GET** `/api/products/new-arrivals` - Sản phẩm mới về
  - Query: `?sort=created_at&order=desc&limit=20`
- **GET** `/api/promotions/active` - Lấy flash sale/promotion đang active
  - Response: `{ promotions[], promotion_products[] }`
- **GET** `/api/categories` - Lấy danh sách categories
  - Query: `?status=active`

#### Screen: Product List (Category/Search)
- **GET** `/api/products` - Lấy danh sách sản phẩm
  - Query: `?category_id=&search=&sort=created_at|price|name&order=asc|desc&page=1&limit=20`
  - Response: `{ products[], pagination }`
- **GET** `/api/products/filters` - Lấy filter options (sizes, colors, price range)
  - Query: `?category_id=`
  - Response: `{ sizes[], colors[], price_range: { min, max } }`

#### Screen: Product Detail
- **GET** `/api/products/:slug` - Chi tiết sản phẩm
  - Response: `{ product, variants[], images[], average_rating, total_reviews }`
- **GET** `/api/products/:slug/variants` - Lấy variants theo product
  - Response: `{ variants[] }` with size, color, stock, images
- **GET** `/api/products/:product_id/reviews` - Lấy đánh giá sản phẩm
  - Query: `?page=1&limit=10&sort=created_at&order=desc`
  - Response: `{ reviews[], pagination }`
- **GET** `/api/products/:product_id/related` - Sản phẩm liên quan
  - Query: `?limit=8`

#### Screen: Search Results
- **GET** `/api/products/search` - Tìm kiếm sản phẩm
  - Query: `?q=keyword&category_id=&min_price=&max_price=&sizes[]=&colors[]=&sort=relevance&page=1&limit=20`

### 1.3. Cart & Checkout

#### Screen: Shopping Cart
- **GET** `/api/cart` - Lấy giỏ hàng hiện tại (session/customer)
  - Response: `{ cart, items[] }` with variant details, quantity, subtotal
- **POST** `/api/cart/items` - Thêm sản phẩm vào giỏ
  - Request: `{ variant_id, quantity }`
- **PUT** `/api/cart/items/:id` - Cập nhật số lượng
  - Request: `{ quantity }`
- **DELETE** `/api/cart/items/:id` - Xóa item khỏi giỏ
- **DELETE** `/api/cart/clear` - Xóa toàn bộ giỏ hàng
- **POST** `/api/cart/merge` - Merge cart khi login (session → customer)

#### Screen: Checkout
- **GET** `/api/customers/me/addresses` - Lấy danh sách địa chỉ
- **POST** `/api/customers/me/addresses` - Thêm địa chỉ mới
  - Request: `{ detailed_address, phone_number, address_type, is_default }`
- **GET** `/api/shipping/calculate` - Tính phí ship
  - Query: `?city=&district=&ward=&weight=`
- **POST** `/api/promotions/validate` - Validate mã giảm giá
  - Request: `{ promotion_code, cart_items[], customer_id }`
- **POST** `/api/orders` - Tạo đơn hàng
  - Request: `{ customer_id, items[], shipping_address, shipping_phone, shipping_city, shipping_district, shipping_ward, payment_method, promotion_id }`
  - Response: `{ order_id, total_amount, payment_url }`

### 1.4. Order Management

#### Screen: Order History
- **GET** `/api/customers/me/orders` - Lấy danh sách đơn hàng
  - Query: `?status=&page=1&limit=10&sort=created_at&order=desc`
  - Response: `{ orders[], pagination }`

#### Screen: Order Detail
- **GET** `/api/orders/:id` - Chi tiết đơn hàng
  - Response: `{ order, items[], status_history[], payment_info }`
- **POST** `/api/orders/:id/cancel` - Hủy đơn hàng (nếu status = pending)
  - Request: `{ reason }`

#### Screen: Order Tracking
- **GET** `/api/orders/:id/tracking` - Tracking đơn hàng
  - Response: `{ order_status, status_history[], estimated_delivery }`

### 1.5. Wishlist

#### Screen: Wishlist
- **GET** `/api/customers/me/wishlist` - Lấy danh sách yêu thích
  - Response: `{ items[] }` with variant, product details
- **POST** `/api/customers/me/wishlist` - Thêm vào wishlist
  - Request: `{ variant_id }`
- **DELETE** `/api/customers/me/wishlist/:id` - Xóa khỏi wishlist

### 1.6. Product Notifications

#### Screen: Product Notification Setup
- **POST** `/api/product-notifications` - Đăng ký thông báo
  - Request: `{ product_id, size, price_condition }`
- **GET** `/api/customers/me/notifications` - Lấy danh sách đăng ký
- **DELETE** `/api/product-notifications/:id` - Hủy đăng ký

### 1.7. Reviews

#### Screen: Write Review (After Purchase)
- **POST** `/api/reviews` - Tạo đánh giá sản phẩm
  - Request: `{ variant_id, order_id, rating, comment }`
- **GET** `/api/customers/me/reviews` - Lấy đánh giá đã viết

### 1.8. Support & Chat

#### Screen: Support Tickets
- **GET** `/api/customers/me/tickets` - Lấy danh sách ticket
  - Query: `?status=&page=1&limit=10`
- **POST** `/api/tickets` - Tạo ticket mới
  - Request: `{ subject, message, priority }`
- **GET** `/api/tickets/:id` - Chi tiết ticket
  - Response: `{ ticket, replies[] }`
- **POST** `/api/tickets/:id/reply` - Trả lời ticket
  - Request: `{ body }`

#### Screen: LeCas Assistant (Chat Full Screen)
**Layout**: ChatGPT-style với sidebar history + main chat area  
**Access**: Navigation bar tab "LeCas Assistant" + Popup bubble chat

**Sidebar (History)**:
- **GET** `/api/chat/sessions/history` - Lấy danh sách chat sessions
  - Query: `?customer_id=&page=1&limit=50`
  - Response: `{ sessions[] }` grouped by time (Hôm nay, Hôm qua, 7 ngày trước...)
- **POST** `/api/chat/sessions` - Tạo session mới
  - Request: `{ customer_id, visitor_id }`
  - Response: `{ session_id, created_at }`
- **DELETE** `/api/chat/sessions/:id` - Xóa session

**Main Chat Area**:
- **GET** `/api/chat/sessions/:id/messages` - Lấy tin nhắn của session
  - Query: `?limit=50&before_id=` (infinite scroll)
  - Response: `{ messages[], has_more }`
- **POST** `/api/chat/sessions/:id/messages` - Gửi tin nhắn
  - Request: `{ sender: 'user'|'bot', message, image? }`
  - Response: `{ message_id, timestamp }`
- **PUT** `/api/chat/messages/:id/read` - Đánh dấu đã đọc
- **POST** `/api/chat/upload-image` - Upload ảnh trong chat
  - Request: `FormData { file }`
  - Response: `{ url }`

**Live Chat Popup (Bubble)**:
- **GET** `/api/chat/sessions/active` - Lấy active session
- Sử dụng các API giống Main Chat Area
- Khi click vào popup → redirect sang trang full screen

**Theme**: Black header, user messages (right, bg-black), bot messages (left, bg-gray-100)

### 1.9. Static Pages

#### Screen: About/Contact/Terms
- **GET** `/api/pages/:slug` - Lấy nội dung trang
  - Response: `{ page: { title, content, status } }`

---

## 2. ADMIN SIDE

### 2.1. Authentication

#### Screen: Admin Login
- **POST** `/api/auth/admin/login` - Admin login
  - Request: `{ email, password }`
  - Response: `{ access_token, refresh_token, admin }`
- **GET** `/api/auth/admin/session` - Kiểm tra session
- **POST** `/api/auth/admin/logout` - Logout

### 2.2. Dashboard

#### Screen: Dashboard Overview
- **GET** `/api/admin/dashboard/stats` - Thống kê tổng quan
  - Response: `{ total_orders, total_revenue, total_customers, pending_orders }`
- **GET** `/api/admin/dashboard/revenue-chart` - Biểu đồ doanh thu
  - Query: `?period=day|week|month&from=&to=`
- **GET** `/api/admin/dashboard/top-products` - Sản phẩm bán chạy
  - Query: `?limit=10&period=week`
- **GET** `/api/admin/dashboard/recent-orders` - Đơn hàng gần đây
  - Query: `?limit=10`

### 2.3. Product Management

#### Screen: Product List
- **GET** `/api/admin/products` - Danh sách sản phẩm
  - Query: `?search=&category_id=&status=active|inactive&sort=created_at&order=desc&page=1&limit=20`
  - Response: `{ products[], pagination }`
- **DELETE** `/api/admin/products/:id` - Soft delete sản phẩm

#### Screen: Product Create/Edit
- **GET** `/api/admin/products/:id` - Chi tiết sản phẩm (edit mode)
- **POST** `/api/admin/products` - Tạo sản phẩm mới
  - Request: `{ name, slug, category_id, description, full_description, cost_price, selling_price, status, thumbnail_url, attributes }`
- **PUT** `/api/admin/products/:id` - Cập nhật sản phẩm
- **GET** `/api/admin/categories` - Lấy categories cho dropdown

#### Screen: Product Variants Management
- **GET** `/api/admin/products/:product_id/variants` - Lấy variants
- **POST** `/api/admin/products/:product_id/variants` - Tạo variant mới
  - Request: `{ size_id, color_id, sku, total_stock, reorder_point }`
- **PUT** `/api/admin/variants/:id` - Cập nhật variant
- **DELETE** `/api/admin/variants/:id` - Soft delete variant
- **GET** `/api/admin/sizes` - Lấy sizes
- **GET** `/api/admin/colors` - Lấy colors

#### Screen: Product Images Management
- **GET** `/api/admin/variants/:variant_id/images` - Lấy images
- **POST** `/api/admin/variants/:variant_id/images` - Upload image
  - Request: `FormData { image, is_main }`
- **PUT** `/api/admin/images/:id` - Cập nhật (set main image)
- **DELETE** `/api/admin/images/:id` - Xóa image

#### Screen: New Arrivals (Sản phẩm mới nhập)
- **GET** `/api/admin/products/new-arrivals` - Sản phẩm mới nhập về
  - Query: `?sort=created_at&order=desc&days=7&page=1&limit=20`
  - Response: `{ products[], pagination }`

### 2.4. Category Management

#### Screen: Category List
- **GET** `/api/admin/categories` - Danh sách categories
  - Query: `?status=&search=&page=1&limit=20`
- **POST** `/api/admin/categories` - Tạo category
  - Request: `{ name, slug, status }`
- **PUT** `/api/admin/categories/:id` - Cập nhật category
- **DELETE** `/api/admin/categories/:id` - Soft delete

### 2.5. Inventory Management

#### Screen: Inventory Overview
- **GET** `/api/admin/inventory/overview` - Tổng quan tồn kho
  - Response: `{ total_variants, low_stock_count, out_of_stock_count }`
- **GET** `/api/admin/inventory/variants` - Danh sách variants với stock
  - Query: `?search=&status=low_stock|out_of_stock|in_stock&page=1&limit=20`
  - Response: `{ variants[], pagination }` with product info, total_stock, reserved_stock

#### Screen: Stock Adjustment (Restock)
- **POST** `/api/admin/restock/batches` - Tạo batch nhập hàng
  - Request: `{ admin_id, type: 'Manual'|'Auto', items: [{ variant_id, quantity }] }`
  - Response: `{ batch_id }`
- **GET** `/api/admin/restock/batches` - Lịch sử nhập hàng
  - Query: `?from=&to=&page=1&limit=20`
- **GET** `/api/admin/restock/batches/:id` - Chi tiết batch
  - Response: `{ batch, items[] }`

#### Screen: Stock History
- **GET** `/api/admin/variants/:id/stock-history` - Lịch sử thay đổi stock
  - Query: `?from=&to=&page=1&limit=20`

### 2.6. Order Management

#### Screen: Order List
- **GET** `/api/admin/orders` - Danh sách đơn hàng
  - Query: `?status=&payment_status=&search=&from=&to=&sort=created_at&order=desc&page=1&limit=20`
  - Response: `{ orders[], pagination }`

#### Screen: Order Detail
- **GET** `/api/admin/orders/:id` - Chi tiết đơn hàng
  - Response: `{ order, items[], customer, status_history[], payment }`
- **PUT** `/api/admin/orders/:id/status` - Cập nhật trạng thái
  - Request: `{ fulfillment_status: 'pending'|'processing'|'shipped'|'delivered'|'cancelled', admin_id }`
- **PUT** `/api/admin/orders/:id/payment-status` - Cập nhật payment status
  - Request: `{ payment_status: 'unpaid'|'paid'|'refunded' }`

#### Screen: Pending Orders
- **GET** `/api/admin/orders/pending` - Đơn hàng chờ xử lý
  - Query: `?page=1&limit=20`

### 2.7. Promotion Management

#### Screen: Promotion List
- **GET** `/api/admin/promotions` - Danh sách promotions
  - Query: `?type=&status=&page=1&limit=20`
- **POST** `/api/admin/promotions` - Tạo promotion
  - Request: `{ name, type: 'flash_sale'|'discount_code', discount_value, discount_type: 'percent'|'fixed', number_limited, start_date, end_date }`
- **PUT** `/api/admin/promotions/:id` - Cập nhật promotion
- **DELETE** `/api/admin/promotions/:id` - Xóa promotion

#### Screen: Promotion Products (Flash Sale)
- **GET** `/api/admin/promotions/:id/products` - Sản phẩm trong promotion
- **POST** `/api/admin/promotions/:id/products` - Thêm sản phẩm vào flash sale
  - Request: `{ product_id, flash_sale_price }`
- **DELETE** `/api/admin/promotions/:promotion_id/products/:product_id` - Xóa sản phẩm

#### Screen: Promotion Usage History
- **GET** `/api/admin/promotions/:id/usage` - Lịch sử sử dụng
  - Query: `?page=1&limit=20`
  - Response: `{ usage[], pagination }` with customer, order info

### 2.8. Customer Management

#### Screen: Customer List
- **GET** `/api/admin/customers` - Danh sách customers
  - Query: `?search=&status=&sort=created_at&order=desc&page=1&limit=20`
  - Response: `{ customers[], pagination }`
- **PUT** `/api/admin/customers/:id/status` - Cập nhật status (active/blocked)
  - Request: `{ status }`

#### Screen: Customer Detail
- **GET** `/api/admin/customers/:id` - Chi tiết customer
  - Response: `{ customer, addresses[], order_summary: { total_orders, total_spent } }`
- **GET** `/api/admin/customers/:id/orders` - Đơn hàng của customer
  - Query: `?page=1&limit=10`

### 2.9. Review Management

#### Screen: Review List
- **GET** `/api/admin/reviews` - Danh sách đánh giá
  - Query: `?status=pending|approved|rejected&product_id=&rating=&page=1&limit=20`
  - Response: `{ reviews[], pagination }`
- **PUT** `/api/admin/reviews/:id/status` - Duyệt/từ chối review
  - Request: `{ status: 'approved'|'rejected' }`
- **DELETE** `/api/admin/reviews/:id` - Xóa review

### 2.10. Support Ticket Management

#### Screen: Ticket List
- **GET** `/api/admin/tickets` - Danh sách tickets
  - Query: `?status=&priority=&search=&page=1&limit=20`
- **GET** `/api/admin/tickets/:id` - Chi tiết ticket
  - Response: `{ ticket, customer, replies[] }`
- **PUT** `/api/admin/tickets/:id/status` - Cập nhật status
  - Request: `{ status: 'pending'|'in_progress'|'resolved'|'closed' }`
- **POST** `/api/admin/tickets/:id/reply` - Trả lời ticket
  - Request: `{ admin_id, body }`
- **PUT** `/api/admin/tickets/:id/priority` - Đổi priority
  - Request: `{ priority: 'low'|'medium'|'high'|'urgent' }`

### 2.11. Chat Management

#### Screen: Chat Sessions List
- **GET** `/api/admin/chat/sessions` - Danh sách chat sessions
  - Query: `?status=active|closed&page=1&limit=20`
- **GET** `/api/admin/chat/sessions/:id` - Chi tiết session
  - Response: `{ session, customer, messages[] }`
- **POST** `/api/admin/chat/sessions/:id/messages` - Gửi tin nhắn (admin)
  - Request: `{ sender: 'admin', message }`

### 2.12. Pages Management (CMS)

#### Screen: Pages List
- **GET** `/api/admin/pages` - Danh sách pages
  - Query: `?status=&search=&page=1&limit=20`
- **POST** `/api/admin/pages` - Tạo page
  - Request: `{ title, slug, content, status: 'Draft'|'Published' }`
- **PUT** `/api/admin/pages/:id` - Cập nhật page
- **DELETE** `/api/admin/pages/:id` - Xóa page

### 2.13. Admin Management

#### Screen: Admin List
- **GET** `/api/admin/admins` - Danh sách admins
- **POST** `/api/admin/admins` - Tạo admin mới
  - Request: `{ name, email, password, role }`
- **PUT** `/api/admin/admins/:id` - Cập nhật admin
- **DELETE** `/api/admin/admins/:id` - Xóa admin

### 2.14. Reports & Analytics

#### Screen: Sales Report
- **GET** `/api/admin/reports/sales` - Báo cáo doanh số
  - Query: `?from=&to=&group_by=day|week|month`
  - Response: `{ data: [{ period, total_orders, total_revenue }] }`

#### Screen: Product Performance
- **GET** `/api/admin/reports/products/best-sellers` - Sản phẩm bán chạy
  - Query: `?from=&to=&limit=20`
- **GET** `/api/admin/reports/products/low-performers` - Sản phẩm bán chậm
  - Query: `?from=&to=&limit=20`

#### Screen: Customer Analytics
- **GET** `/api/admin/reports/customers/new` - Khách hàng mới
  - Query: `?from=&to=&group_by=day|week|month`
- **GET** `/api/admin/reports/customers/top-spenders` - Khách hàng chi tiêu nhiều
  - Query: `?limit=20`

---

## 3. COMMON/UTILITY APIs

### File Upload
- **POST** `/api/upload/image` - Upload single image
  - Request: `FormData { file }`
  - Response: `{ url }`
- **POST** `/api/upload/images` - Upload multiple images
  - Request: `FormData { files[] }`
  - Response: `{ urls[] }`

### Location
- **GET** `/api/locations/cities` - Lấy danh sách tỉnh/thành
- **GET** `/api/locations/districts/:city_id` - Lấy quận/huyện
- **GET** `/api/locations/wards/:district_id` - Lấy phường/xã

### Search & Autocomplete
- **GET** `/api/search/suggestions` - Gợi ý tìm kiếm
  - Query: `?q=keyword&limit=5`

---

## 4. WEBSOCKET/REALTIME EVENTS (Optional)

### Chat
- **Channel**: `/chat/session/:session_id`
  - Event: `message.new` - Tin nhắn mới
  - Event: `typing` - Đang gõ

### Notifications
- **Channel**: `/notifications/customer/:customer_id`
  - Event: `order.status_changed` - Đơn hàng thay đổi status
  - Event: `product.available` - Sản phẩm đã có hàng (từ product_notifications)

### Admin
- **Channel**: `/admin/dashboard`
  - Event: `order.new` - Đơn hàng mới
  - Event: `ticket.new` - Ticket mới

---

## 5. NOTES

### Pagination Format
```json
{
  "data": [],
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_items": 200,
    "per_page": 20
  }
}
```

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Authentication
- Customer: `Authorization: Bearer <access_token>`
- Admin: `Authorization: Bearer <admin_access_token>`
- Session-based cart: Sử dụng `session_id` trong cookie hoặc header

### Stock Management
- `total_stock`: Tổng số lượng tồn kho
- `reserved_stock`: Số lượng đang giữ (trong giỏ hàng chưa thanh toán)
- `available_stock`: `total_stock - reserved_stock`

### Soft Delete
Các entity có `deleted_at`:
- products
- product_variants
- categories
- customers

API phải filter `deleted_at IS NULL` khi query.
