# 🔐 AUTHENTICATION API DOCUMENTATION

**Base URL:** `http://localhost:3001`  
**Version:** v1  
**Last Updated:** 2025-11-08

---

## 📋 AUTHENTICATION ENDPOINTS

### 1️⃣ POST `/api/v1/auth/register`
**Đăng ký tài khoản bằng email/password**

#### Request Body:
```json
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "MatKhau123@"
}
```

#### Response (201):
```json
{
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt tài khoản."
}
```

**Logic:**
- Tạo customer với `status='inactive'`
- Hash password với bcrypt
- Tạo activation token (JWT, 24h expiry)
- Gửi email kích hoạt

---

### 2️⃣ POST `/api/v1/auth/activate`
**Kích hoạt tài khoản (từ link trong email)**

#### Request Body:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200):
```json
{
  "message": "Kích hoạt tài khoản thành công",
  "customer": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "status": "active"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Logic:**
- Verify activation token
- Đổi `status='active'`
- Generate Access Token (15 phút) + Refresh Token (30 ngày)
- Tự động đăng nhập

---

### 3️⃣ POST `/api/v1/auth/login`
**Đăng nhập bằng email/password**

#### Request Body:
```json
{
  "email": "user@example.com",
  "password": "MatKhau123@"
}
```

#### Response (200):
```json
{
  "message": "Đăng nhập thành công",
  "customer": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "status": "active"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Logic:**
- Kiểm tra email + password
- Kiểm tra `status='active'`
- Generate tokens
- Lưu refresh_token vào DB

---

### 4️⃣ POST `/api/v1/auth/google`
**Đăng nhập/Đăng ký bằng Google**

#### Request Body:
```json
{
  "auth_code": "4/0AY0e-g7xxxxxxxxxxx"
}
```

#### Response (200):
```json
{
  "message": "Đăng nhập Google thành công",
  "customer": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "status": "active"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Logic:**
- Frontend lấy `auth_code` từ Google
- Backend exchange `auth_code` → Google tokens
- Lấy user info từ Google API
- Nếu email tồn tại → Login
- Nếu email chưa có → Register (auto-activate)

---

### 5️⃣ POST `/api/v1/auth/refresh`
**Làm mới Access Token (API chạy ngầm)**

#### Request Body:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Logic:**
- Verify refresh_token (check DB)
- Kiểm tra expiry (30 ngày)
- Generate access_token mới (15 phút)

---

### 6️⃣ POST `/api/v1/auth/logout`
**Đăng xuất** 🔒 (Requires Auth)

#### Headers:
```
Authorization: Bearer {access_token}
```

#### Response (200):
```json
{
  "message": "Đăng xuất thành công"
}
```

**Logic:**
- Xóa `refresh_token` trong DB
- Client xóa tokens ở local storage

---

### 7️⃣ POST `/api/v1/auth/forgot-password`
**Gửi yêu cầu đặt lại mật khẩu**

#### Request Body:
```json
{
  "email": "user@example.com"
}
```

#### Response (200):
```json
{
  "message": "Nếu email của bạn tồn tại, một link đặt lại mật khẩu đã được gửi."
}
```

**Logic:**
- **Luôn trả về success** (tránh email enumeration attack)
- Nếu email tồn tại → gửi email chứa reset token (30 phút)
- Link: `http://localhost:3000/reset-password?token=...`

---

### 8️⃣ POST `/api/v1/auth/verify-reset-token`
**Xác thực token đặt lại mật khẩu (API phụ trợ)**

#### Request Body:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200):
```json
{
  "valid": true,
  "message": "Token hợp lệ."
}
```

**Logic:**
- Frontend gọi API này trước khi hiển thị form
- Verify token có còn hạn không

---

### 9️⃣ POST `/api/v1/auth/reset-password`
**Đặt mật khẩu mới (Hoàn tất)**

#### Request Body:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "MatKhauMoiManh123@"
}
```

#### Response (200):
```json
{
  "message": "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay."
}
```

**Logic:**
- Verify token
- Hash password mới
- Update `password_hash` trong DB

---

## 🔑 TOKEN CONFIGURATION

| Token Type | Expiry | Storage | Purpose |
|------------|--------|---------|---------|
| **Access Token** | 15 phút | Memory/State | API authentication |
| **Refresh Token** | 30 ngày | Database + LocalStorage | Renew access token |
| **Activation Token** | 24 giờ | Email link | Account activation |
| **Reset Token** | 30 phút | Email link | Password reset |

---

## 🎯 FRONTEND INTEGRATION

### 1. Registration Flow
```javascript
// Step 1: Register
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password })
});

// Step 2: User clicks link in email → redirect to /activate?token=...

// Step 3: Frontend calls activate
const activateResponse = await fetch('/api/v1/auth/activate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: urlParams.get('token') })
});

const { access_token, refresh_token } = await activateResponse.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

### 2. Login Flow
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { access_token, refresh_token } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

### 3. Auto-Refresh Token (Silent Renewal)
```javascript
// Gọi mỗi 14 phút (trước khi access token hết hạn)
setInterval(async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  if (response.ok) {
    const { access_token } = await response.json();
    localStorage.setItem('access_token', access_token);
  } else {
    // Refresh token expired → redirect to login
    window.location.href = '/login';
  }
}, 14 * 60 * 1000); // 14 minutes
```

### 4. Protected API Calls
```javascript
const accessToken = localStorage.getItem('access_token');

const response = await fetch('/api/v1/protected-resource', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

if (response.status === 401) {
  // Token expired → try refresh
  await refreshAccessToken();
}
```

### 5. Google Login Flow
```javascript
// Frontend: Get auth code from Google
const googleClient = google.accounts.oauth2.initCodeClient({
  client_id: 'YOUR_GOOGLE_CLIENT_ID',
  scope: 'email profile',
  callback: async (response) => {
    const authCode = response.code;
    
    // Send to backend
    const backendResponse = await fetch('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: authCode })
    });
    
    const { access_token, refresh_token } = await backendResponse.json();
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
  }
});

googleClient.requestCode();
```

---

## ⚙️ ENVIRONMENT VARIABLES

```env
# JWT
JWT_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

---

## 🗄️ DATABASE SCHEMA

### Table: `customers`
```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR,
  email VARCHAR UNIQUE NOT NULL,
  password_hash TEXT,
  status VARCHAR DEFAULT 'inactive', -- 'inactive' | 'active'
  refresh_token TEXT,
  refresh_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_refresh_token ON customers(refresh_token);
```

---

## 🛡️ SECURITY FEATURES

✅ **Password Hashing:** bcrypt (10 rounds)  
✅ **JWT Signing:** HS256 algorithm  
✅ **Email Enumeration Protection:** Always return success for forgot-password  
✅ **Token Expiry:** Short-lived access tokens (15m), long-lived refresh tokens (30d)  
✅ **Refresh Token Storage:** Database-backed (can be revoked)  
✅ **HTTPS Required:** Use in production  

---

## 📞 SUPPORT

- **Questions:** Contact backend team
- **Swagger UI:** `http://localhost:3001/api-docs`

**Ready for Frontend Integration!** 🚀
