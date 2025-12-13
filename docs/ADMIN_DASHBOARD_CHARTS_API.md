# Admin Dashboard Charts API Specification

## Overview
API endpoints để cung cấp dữ liệu cho 2 charts trong Admin Dashboard:
1. **Line Chart**: Revenue & Orders Trend (30 ngày)
2. **Pie Chart**: Order Status Distribution

---

## 1. LINE CHART API - Revenue & Orders Trend

### Endpoint
```
GET /api/admin/dashboard/revenue-orders-trend
```

### Authentication
```
Authorization: Bearer {access_token}
```

### Query Parameters
| Parameter | Type   | Required | Default | Description                        |
|-----------|--------|----------|---------|-------------------------------------|
| days      | number | No       | 30      | Số ngày cần lấy dữ liệu (7, 30, 90)|

### Request Example
```
GET /api/admin/dashboard/revenue-orders-trend?days=30
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "dailyStats": [
      {
        "date": "2024-11-12",
        "day": "Day 1",
        "revenue": 2500000,
        "revenueInMillions": 2.5,
        "ordersCount": 15
      },
      {
        "date": "2024-11-13",
        "day": "Day 2",
        "revenue": 3200000,
        "revenueInMillions": 3.2,
        "ordersCount": 18
      },
      // ... 28 days more (total 30 days)
      {
        "date": "2024-12-11",
        "day": "Day 30",
        "revenue": 8800000,
        "revenueInMillions": 8.8,
        "ordersCount": 52
      }
    ],
    "summary": {
      "totalRevenue": 165000000,
      "totalOrders": 950,
      "averageDailyRevenue": 5500000,
      "averageDailyOrders": 31.67,
      "revenueGrowth": 12.5,
      "ordersGrowth": 8.3
    },
    "dateRange": {
      "from": "2024-11-12",
      "to": "2024-12-11"
    }
  }
}
```

### Response Error (401 Unauthorized)
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### Response Error (500 Internal Server Error)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

---

## 2. PIE CHART API - Order Status Distribution

### Endpoint
```
GET /api/admin/dashboard/order-status-distribution
```

### Authentication
```
Authorization: Bearer {access_token}
```

### Query Parameters
| Parameter | Type   | Required | Default | Description                        |
|-----------|--------|----------|---------|-------------------------------------|
| days      | number | No       | 30      | Số ngày cần lấy dữ liệu (7, 30, 90)|

### Request Example
```
GET /api/admin/dashboard/order-status-distribution?days=30
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "distribution": [
      {
        "status": "completed",
        "statusLabel": "Completed",
        "count": 120,
        "percentage": 60.0,
        "color": "#10b981"
      },
      {
        "status": "processing",
        "statusLabel": "Processing",
        "count": 40,
        "percentage": 20.0,
        "color": "#3b82f6"
      },
      {
        "status": "pending",
        "statusLabel": "Pending",
        "count": 30,
        "percentage": 15.0,
        "color": "#f59e0b"
      },
      {
        "status": "cancelled",
        "statusLabel": "Cancelled",
        "count": 10,
        "percentage": 5.0,
        "color": "#ef4444"
      }
    ],
    "summary": {
      "totalOrders": 200,
      "completionRate": 60.0,
      "cancellationRate": 5.0
    },
    "dateRange": {
      "from": "2024-11-12",
      "to": "2024-12-11"
    }
  }
}
```

### Response Error (401 Unauthorized)
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### Response Error (500 Internal Server Error)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

---

## Database Schema Requirements

### Order Status Enum Values
Backend cần support các status sau:
- `completed` - Đơn hàng đã hoàn thành và giao hàng thành công
- `processing` - Đơn hàng đang được xử lý/đang giao hàng
- `pending` - Đơn hàng chờ xác nhận
- `cancelled` - Đơn hàng đã bị hủy

### Required Database Fields
```sql
orders table:
- id (INT/UUID)
- status (ENUM: 'completed', 'processing', 'pending', 'cancelled')
- total_amount (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## Backend Implementation Guide

### 1. Revenue & Orders Trend Query (SQL Example)
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as orders_count,
    SUM(total_amount) as revenue,
    ROUND(SUM(total_amount) / 1000000, 1) as revenue_in_millions
FROM orders
WHERE 
    created_at >= NOW() - INTERVAL :days DAY
    AND status != 'cancelled'
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

### 2. Order Status Distribution Query (SQL Example)
```sql
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL :days DAY)), 2) as percentage
FROM orders
WHERE created_at >= NOW() - INTERVAL :days DAY
GROUP BY status
ORDER BY count DESC;
```

---

## Frontend Integration Notes

### Service Location
```
lib/services/admin/dashboardService.ts
```

### TypeScript Interfaces
```typescript
// Line Chart Data
export interface DailyStats {
  date: string;
  day: string;
  revenue: number;
  revenueInMillions: number;
  ordersCount: number;
}

export interface RevenueTrendResponse {
  dailyStats: DailyStats[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageDailyRevenue: number;
    averageDailyOrders: number;
    revenueGrowth: number;
    ordersGrowth: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}

// Pie Chart Data
export interface OrderStatusItem {
  status: string;
  statusLabel: string;
  count: number;
  percentage: number;
  color: string;
}

export interface OrderStatusDistributionResponse {
  distribution: OrderStatusItem[];
  summary: {
    totalOrders: number;
    completionRate: number;
    cancellationRate: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
}
```

---

## Testing Endpoints

### Using cURL

**Revenue & Orders Trend:**
```bash
curl -X GET "http://localhost:5000/api/admin/dashboard/revenue-orders-trend?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Order Status Distribution:**
```bash
curl -X GET "http://localhost:5000/api/admin/dashboard/order-status-distribution?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Notes for Backend Developer

1. **Date Range Filtering:**
   - Sử dụng `created_at` field để filter orders
   - Mặc định: 30 ngày gần nhất
   - Support 3 options: 7, 30, 90 days

2. **Revenue Calculation:**
   - Chỉ tính revenue từ orders có status != 'cancelled'
   - Convert về millions (chia cho 1,000,000) để dễ hiển thị
   - VND currency format

3. **Performance:**
   - Nên cache kết quả 5-10 phút vì dashboard data không cần real-time
   - Index trên `created_at` và `status` columns

4. **Security:**
   - Verify admin role trước khi cho phép truy cập
   - Rate limiting: 100 requests/minute per user

5. **Response Time:**
   - Target: < 500ms cho mỗi endpoint
   - Sử dụng database indexes và optimize queries

---

## Color Codes Reference

### Line Chart Colors
- Revenue line: `#4880FF` (Blue)
- Orders line: `#10b981` (Green)

### Pie Chart Colors
- Completed: `#10b981` (Green)
- Processing: `#3b82f6` (Blue)
- Pending: `#f59e0b` (Orange/Amber)
- Cancelled: `#ef4444` (Red)

---

## Version History
- v1.0 (2024-12-11): Initial API specification
