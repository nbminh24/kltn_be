# Backend Bug Report: Missing Support Tickets API Endpoint

## Summary
Backend thiếu API endpoint `/admin/support-tickets` để lấy danh sách support tickets trong admin panel.

---

## Issue Type
**Missing API Endpoint**

---

## Expected Endpoint

### GET `/admin/support-tickets`

**Description:** Lấy danh sách support tickets với filter và pagination

---

## Request Details

### Method
```
GET
```

### Endpoint
```
/admin/support-tickets
```

### Headers
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter theo trạng thái: `pending`, `in_progress`, `resolved`, `closed` |
| page | number | No | Số trang (default: 1) |
| limit | number | No | Số items per page (default: 10) |

### Example Request
```
GET /admin/support-tickets?status=pending&page=1&limit=100
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Expected Response

### Success Response (200 OK)
```json
{
  "data": [
    {
      "id": "uuid",
      "ticket_code": "TK001234",
      "customer_email": "customer@example.com",
      "subject": "Product inquiry",
      "message": "Message content...",
      "status": "pending",
      "priority": "high",
      "source": "contact_form",
      "created_at": "2024-12-07T10:30:00Z",
      "updated_at": "2024-12-07T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

### Error Response (401 Unauthorized)
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### Error Response (403 Forbidden)
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

---

## Current Behavior
- Frontend gọi API đến `http://localhost:3001/admin/support-tickets`
- Token được attach vào header
- Backend **không trả về response** (endpoint chưa được implement)
- Component bị crash do `tickets.filter is not a function`

---

## Frontend Logs
```
🌐 API Request: {
  baseURL: 'http://localhost:3001',
  url: '/admin/support-tickets',
  fullURL: 'http://localhost:3001/admin/support-tickets',
  method: 'get'
}
🔐 Token attached: eyJhbGciOiJIUzI1NiIs...
```

---

## Related Frontend Code

### Service Call Location
**File:** `lib/services/admin/supportService.ts`

### Usage Location
**File:** `app/admin/support-inbox/page.tsx`
**Line:** 41-46

```typescript
const fetchTickets = async () => {
    try {
        setLoading(true);
        const response = await adminSupportService.getTickets({
            status: filterStatus,
            page: 1,
            limit: 100
        });
        setTickets(response.data || []);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        showToast('Failed to load tickets', 'error');
        setTickets([]);
    } finally {
        setLoading(false);
    }
};
```

---

## Database Requirements

### Suggested Table: `support_tickets`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key |
| ticket_code | VARCHAR | No | Unique ticket code (e.g., TK001234) |
| customer_email | VARCHAR | No | Email của customer |
| subject | VARCHAR | No | Tiêu đề ticket |
| message | TEXT | No | Nội dung ticket |
| status | ENUM | No | `pending`, `in_progress`, `resolved`, `closed` |
| priority | ENUM | No | `low`, `medium`, `high` |
| source | ENUM | No | `contact_form`, `email`, `chat` |
| created_at | TIMESTAMP | No | Thời gian tạo |
| updated_at | TIMESTAMP | No | Thời gian cập nhật |

### Indexes
- `idx_status` on `status`
- `idx_created_at` on `created_at`
- `unique_ticket_code` on `ticket_code`

---

## Action Required

### Backend Tasks
1. ✅ Tạo database table `support_tickets` nếu chưa có
2. ✅ Tạo model/entity cho Support Ticket
3. ✅ Implement GET `/admin/support-tickets` endpoint
4. ✅ Thêm authentication middleware (admin only)
5. ✅ Implement filter theo status
6. ✅ Implement pagination
7. ✅ Test endpoint với Postman/Thunder Client

### Testing Checklist
- [ ] Test GET tickets với status filter
- [ ] Test pagination
- [ ] Test authentication (401 nếu không có token)
- [ ] Test authorization (403 nếu không phải admin)
- [ ] Test response format đúng với frontend expectation

---

## Priority
🔴 **HIGH** - Blocking feature: Admin không thể xem support tickets

---

## Related Endpoints (Cần implement thêm)
1. `POST /admin/support-tickets/:id/reply` - Trả lời ticket
2. `PATCH /admin/support-tickets/:id/status` - Cập nhật status
3. `GET /admin/support-tickets/:id` - Chi tiết ticket
4. `GET /admin/support-tickets/stats` - Thống kê tickets

---

## Notes
- Frontend đã được fix để handle empty array
- Frontend expect `response.data` là array
- Cần đảm bảo response format consistent với các API khác trong hệ thống
