# Backend API Requirements - Promotions Module

## Issue
- Old endpoint `/admin/promotions` returns: `"Feature deprecated - use /api/v1/promotions"`
- New endpoint `/api/v1/promotions` returns: `404 Not Found`
- **Frontend cần endpoint hoạt động để quản lý khuyến mãi**

---

## Required Endpoints

### 1. Get All Promotions (with filter)
```
GET /api/v1/promotions?status={status}&page={page}&limit={limit}
```

**Query Parameters:**
- `status` (optional): `active` | `expired` | `scheduled`
- `page` (optional): integer, default = 1
- `limit` (optional): integer, default = 10
- `search` (optional): string - search by name

**Response 200:**
```json
{
  "promotions": [
    {
      "id": 1,
      "name": "Summer Sale 2024",
      "type": "voucher",
      "discount_value": 20,
      "discount_type": "percentage",
      "number_limited": 100,
      "start_date": "2024-06-01T00:00:00.000Z",
      "end_date": "2024-06-30T23:59:59.999Z",
      "status": "active",
      "used_count": 45
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**Field Specifications:**
- `type`: `"voucher"` hoặc `"flash_sale"`
- `discount_type`: `"percentage"` hoặc `"fixed_amount"`
- `status`: `"scheduled"` | `"active"` | `"expired"` (auto-calculated based on dates)
- `used_count`: số lần promotion đã được sử dụng (optional)

---

### 2. Get Promotion by ID
```
GET /api/v1/promotions/:id
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Summer Sale 2024",
  "type": "voucher",
  "discount_value": 20,
  "discount_type": "percentage",
  "number_limited": 100,
  "start_date": "2024-06-01T00:00:00.000Z",
  "end_date": "2024-06-30T23:59:59.999Z",
  "status": "active",
  "used_count": 45
}
```

**Response 404:**
```json
{
  "message": "Promotion not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### 3. Create Promotion
```
POST /api/v1/promotions
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Merry Phát tài",
  "type": "flash_sale",
  "discount_value": 10,
  "discount_type": "percentage",
  "number_limited": 100,
  "start_date": "2026-01-10",
  "end_date": "2026-01-31"
}
```

**IMPORTANT:**
- ❌ **KHÔNG** gửi field `status` khi tạo mới
- ✅ Backend tự động tính `status` dựa trên `start_date` và `end_date`:
  - Nếu `start_date` > current_date → `"scheduled"`
  - Nếu `start_date` <= current_date <= `end_date` → `"active"`
  - Nếu `end_date` < current_date → `"expired"`

**Validation Rules:**
- `name`: required, string, max 255 characters
- `type`: required, enum: `"voucher"` | `"flash_sale"`
- `discount_value`: required, number > 0
- `discount_type`: required, enum: `"percentage"` | `"fixed_amount"`
- `number_limited`: optional, integer >= 0 (0 = unlimited)
- `start_date`: required, ISO date string format `YYYY-MM-DD`
- `end_date`: required, ISO date string, must be >= `start_date`

**Response 201:**
```json
{
  "id": 3,
  "name": "Merry Phát tài",
  "type": "flash_sale",
  "discount_value": 10,
  "discount_type": "percentage",
  "number_limited": 100,
  "start_date": "2026-01-10T00:00:00.000Z",
  "end_date": "2026-01-31T23:59:59.999Z",
  "status": "scheduled",
  "used_count": 0
}
```

**Response 400 (validation error):**
```json
{
  "message": "Validation failed",
  "errors": [
    "end_date must be greater than or equal to start_date",
    "discount_value must be greater than 0"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 4. Update Promotion
```
PUT /api/v1/promotions/:id
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Request Body (partial update allowed):**
```json
{
  "name": "Updated Sale Name",
  "discount_value": 25,
  "number_limited": 200,
  "status": "active"
}
```

**IMPORTANT:**
- ✅ Update **CÓ THỂ** bao gồm field `status` để admin manually thay đổi
- Validation rules giống như Create

**Response 200:**
```json
{
  "id": 1,
  "name": "Updated Sale Name",
  "type": "voucher",
  "discount_value": 25,
  "discount_type": "percentage",
  "number_limited": 200,
  "start_date": "2024-06-01T00:00:00.000Z",
  "end_date": "2024-06-30T23:59:59.999Z",
  "status": "active",
  "used_count": 45
}
```

**Response 404:**
```json
{
  "message": "Promotion not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### 5. Delete Promotion
```
DELETE /api/v1/promotions/:id
Authorization: Bearer {admin_access_token}
```

**Response 200:**
```json
{
  "message": "Promotion deleted successfully"
}
```

**Response 404:**
```json
{
  "message": "Promotion not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Security Requirements

1. **Authentication**: All endpoints require valid `admin_access_token` in `Authorization: Bearer {token}` header
2. **Authorization**: Only admin users can access promotion management endpoints
3. **CORS**: Allow frontend origin

---

## Test Cases

### Test Case 1: Create Promotion Successfully
```bash
POST /api/v1/promotions
{
  "name": "Test Promotion",
  "type": "voucher",
  "discount_value": 15,
  "discount_type": "percentage",
  "number_limited": 50,
  "start_date": "2026-01-15",
  "end_date": "2026-01-30"
}
# Expected: 201 Created with promotion object
```

### Test Case 2: Create with Invalid Date
```bash
POST /api/v1/promotions
{
  "name": "Invalid Promotion",
  "type": "voucher",
  "discount_value": 10,
  "discount_type": "percentage",
  "number_limited": 100,
  "start_date": "2026-01-30",
  "end_date": "2026-01-15"  # end_date < start_date
}
# Expected: 400 Bad Request with validation error
```

### Test Case 3: Get Active Promotions
```bash
GET /api/v1/promotions?status=active
# Expected: 200 OK with list of active promotions
```

### Test Case 4: Update Promotion
```bash
PUT /api/v1/promotions/1
{
  "name": "Updated Name",
  "discount_value": 30
}
# Expected: 200 OK with updated promotion
```

### Test Case 5: Delete Promotion
```bash
DELETE /api/v1/promotions/1
# Expected: 200 OK with success message
```

---

## Current Status

❌ **All endpoints return 404 - Backend chưa implement**

Frontend đã sẵn sàng và đang chờ backend implement theo spec trên.

## Priority

🔴 **HIGH** - Promotion management là core feature cần thiết cho admin

## Questions for Backend Team

1. Endpoint path chính xác là `/api/v1/promotions` hay `/api/v1/admin/promotions`?
2. Database schema cho promotions table đã được tạo chưa?
3. Có cần thêm field nào khác không (e.g., `code`, `description`, `min_order_value`)?
4. Status auto-calculation logic có đúng với business requirements không?
