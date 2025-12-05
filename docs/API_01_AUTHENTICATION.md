# 🔐 Module 1: Authentication

> **Customer & Admin Authentication APIs**  
> **Total Endpoints:** 16  
> **Last Updated:** December 5, 2025

---

## 📑 Table of Contents

### Customer Authentication
1. [POST /api/v1/auth/register](#1-post-apiv1authregister) - Đăng ký tài khoản
2. [GET /api/v1/auth/activate](#2-get-apiv1authactivate) - Kích hoạt (redirect)
3. [POST /api/v1/auth/activate](#3-post-apiv1authactivate) - Kích hoạt (API)
4. [POST /api/v1/auth/login](#4-post-apiv1authlogin) - Đăng nhập
5. [POST /api/v1/auth/google](#5-post-apiv1authgoogle) - Đăng nhập Google
6. [POST /api/v1/auth/refresh](#6-post-apiv1authrefresh) - Refresh token
7. [POST /api/v1/auth/logout](#7-post-apiv1authlogout) - Đăng xuất
8. [POST /api/v1/auth/forgot-password](#8-post-apiv1authforgot-password) - Quên mật khẩu
9. [POST /api/v1/auth/verify-reset-token](#9-post-apiv1authverify-reset-token) - Verify reset token
10. [POST /api/v1/auth/reset-password](#10-post-apiv1authreset-password) - Reset mật khẩu

### Admin Authentication
11. [POST /api/v1/admin/auth/login](#11-post-apiv1adminauthlogin) - Admin login
12. [GET /api/v1/admin/auth/me](#12-get-apiv1adminauthme) - Admin profile
13. [POST /api/v1/admin/auth/logout](#13-post-apiv1adminauthlogout) - Admin logout
14. [POST /api/v1/admin/auth/create](#14-post-apiv1adminauthcreate) - Tạo admin mới
15. [POST /api/v1/admin/auth/reset-password](#15-post-apiv1adminauthreset-password) - Reset password (auth)
16. [POST /api/v1/admin/auth/public-reset-password](#16-post-apiv1adminauthpublic-reset-password) - Reset password (public)

---

# Customer Authentication

## 1. POST `/api/v1/auth/register`
**Đăng ký tài khoản customer mới**

### 📋 Overview
Tạo tài khoản mới với status `inactive`. Hệ thống gửi email kích hoạt. User phải click link trong email để kích hoạt tài khoản trước khi đăng nhập.

### 🔓 Authentication
**Public** - Không cần authentication

### 📥 Request

#### Headers
```
Content-Type: application/json
```

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | ✅ | Min 1 char | Tên hiển thị |
| `email` | string | ✅ | Valid email format, unique | Email đăng nhập |
| `password` | string | ✅ | Min 6 chars | Mật khẩu |
| `phone` | string | ❌ | 10 digits | Số điện thoại (optional) |

#### Request Example
```json
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "SecurePass123",
  "phone": "0901234567"
}
```

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",
  "customer": {
    "id": 123,
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "phone": "0901234567",
    "status": "inactive",
    "created_at": "2024-12-05T10:00:00Z"
  }
}
```

#### Error Responses

**409 Conflict - Email đã tồn tại**
```json
{
  "statusCode": 409,
  "message": "Email đã được sử dụng",
  "error": "Conflict"
}
```

**400 Bad Request - Validation errors**
```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 6 characters",
    "phone must be a valid phone number"
  ],
  "error": "Bad Request"
}
```

### 🔄 Logic Flow
1. **Validate input:**
   - Email format valid
   - Password >= 6 characters
   - Phone format (if provided): 10 digits
2. **Check email uniqueness:**
   - Query database for existing email
   - If exists → throw 409 Conflict
3. **Hash password:**
   - Use bcrypt with saltRounds=10
4. **Create customer record:**
   - `status = 'inactive'`
   - `email_verified = false`
   - `created_at = NOW()`
5. **Generate activation token:**
   - JWT token with payload: `{ customer_id, email }`
   - Expiry: 24 hours
6. **Send activation email:**
   - Template: "Welcome! Please activate your account"
   - Link: `{FRONTEND_URL}/auth/activate?token=xxx`
7. **Return success response**

### 📝 Implementation Notes
- Email is case-insensitive (converted to lowercase)
- User **cannot login** until account is activated
- Activation token expires after 24 hours
- If token expired, user needs to request new activation email

### 🧪 cURL Example
```bash
curl -X POST https://api.yourshop.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "password": "SecurePass123",
    "phone": "0901234567"
  }'
```

### 💻 JavaScript Example
```javascript
const response = await fetch('https://api.yourshop.com/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Nguyễn Văn A',
    email: 'user@example.com',
    password: 'SecurePass123',
    phone: '0901234567'
  })
});

const data = await response.json();

if (response.ok) {
  console.log('Registration successful:', data);
  // Show message: "Check your email to activate account"
} else {
  console.error('Registration failed:', data.message);
}
```

---

## 2. GET `/api/v1/auth/activate`
**Kích hoạt tài khoản (Click link trong email)**

### 📋 Overview
User click vào link trong email → Browser navigate đến endpoint này → Backend kích hoạt tài khoản → Redirect về frontend với tokens trong URL.

### 🔓 Authentication
**Public** - Không cần authentication (token trong query param)

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | ✅ | JWT activation token từ email |

#### Request Example
```
GET /api/v1/auth/activate?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcl9pZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDE4MzY0MDAsImV4cCI6MTcwMTkyMjgwMH0.xxx
```

### 📤 Response

#### Success (302 Redirect)
Redirects to:
```
{FRONTEND_URL}/auth/success?access_token=xxx&refresh_token=yyy
```

Frontend should:
1. Parse tokens from URL
2. Store tokens securely (localStorage/sessionStorage)
3. Redirect to homepage or dashboard
4. Show success message: "Account activated successfully!"

#### Error (302 Redirect)
Redirects to:
```
{FRONTEND_URL}/auth/error?message=Token%20không%20hợp%20lệ%20hoặc%20đã%20hết%20hạn
```

Frontend should:
1. Parse error message from URL
2. Display error to user
3. Provide option to resend activation email

### 🔄 Logic Flow
1. **Verify JWT token:**
   - Decode and validate signature
   - Check expiry (24 hours)
   - If invalid → redirect to error page
2. **Extract customer_id:**
   - From token payload
3. **Check customer exists:**
   - Query database
   - If not found → redirect to error page
4. **Update customer status:**
   - Set `status = 'active'`
   - Set `email_verified = true`
   - Set `activated_at = NOW()`
5. **Generate new tokens:**
   - Access token (15 minutes)
   - Refresh token (30 days)
6. **Save refresh token:**
   - Store in database for logout functionality
7. **Redirect to frontend:**
   - With tokens in URL parameters

### 📝 Implementation Notes
- This is a **GET redirect endpoint** (not API call)
- Used when user clicks link in email
- Tokens are passed in URL (not ideal for security, but acceptable for this flow)
- Frontend should immediately extract tokens and clear URL

### 🧪 Browser Example
```
User clicks: https://api.yourshop.com/api/v1/auth/activate?token=xxx
↓
Backend processes activation
↓
Browser redirects to: https://yourshop.com/auth/success?access_token=xxx&refresh_token=yyy
↓
Frontend extracts tokens and stores securely
```

---

## 3. POST `/api/v1/auth/activate`
**Kích hoạt tài khoản (API call alternative)**

### 📋 Overview
Alternative API endpoint for activation. Dùng khi frontend muốn xử lý activation qua API call thay vì redirect.

### 🔓 Authentication
**Public** - Không cần authentication

### 📥 Request

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | JWT activation token từ email |

#### Request Example
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Kích hoạt tài khoản thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "id": 123,
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "status": "active",
    "email_verified": true
  }
}
```

#### Error Responses

**401 Unauthorized - Token không hợp lệ**
```json
{
  "statusCode": 401,
  "message": "Token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}
```

**404 Not Found - Customer không tồn tại**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy tài khoản",
  "error": "Not Found"
}
```

### 🔄 Logic Flow
Same as GET `/activate` but returns JSON instead of redirect

### 💻 JavaScript Example
```javascript
// Extract token from email link
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Call activation API
const response = await fetch('https://api.yourshop.com/api/v1/auth/activate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const data = await response.json();

if (response.ok) {
  // Store tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  // Redirect to homepage
  window.location.href = '/';
} else {
  alert(data.message);
}
```

---

## 4. POST `/api/v1/auth/login`
**Đăng nhập bằng email/password**

### 📋 Overview
Authenticate customer và trả về access token (15 phút) + refresh token (30 ngày).

### 🔓 Authentication
**Public** - Không cần authentication

### 📥 Request

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | string | ✅ | Valid email | Email đăng ký |
| `password` | string | ✅ | Min 6 chars | Mật khẩu |

#### Request Example
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đăng nhập thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEyMywiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwidHlwZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzAxODM2NDAwLCJleHAiOjE3MDE4MzczMDB9.xxx",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEyMywidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3MDE4MzY0MDAsImV4cCI6MTcwNDQyODQwMH0.yyy",
  "customer": {
    "id": 123,
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "phone": "0901234567",
    "status": "active"
  }
}
```

**JWT Payload (access_token):**
```json
{
  "sub": 123,
  "email": "user@example.com",
  "type": "customer",
  "iat": 1701836400,
  "exp": 1701837300
}
```

#### Error Responses

**401 Unauthorized - Sai email/password**
```json
{
  "statusCode": 401,
  "message": "Email hoặc mật khẩu không chính xác",
  "error": "Unauthorized"
}
```

**401 Unauthorized - Tài khoản chưa kích hoạt**
```json
{
  "statusCode": 401,
  "message": "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.",
  "error": "Unauthorized"
}
```

**401 Unauthorized - Tài khoản bị khóa**
```json
{
  "statusCode": 401,
  "message": "Tài khoản đã bị khóa. Vui lòng liên hệ admin.",
  "error": "Unauthorized"
}
```

### 🔄 Logic Flow
1. **Find customer by email:**
   - Query: `SELECT * FROM customers WHERE email = ? AND deleted_at IS NULL`
   - If not found → 401 (Email/password incorrect)
2. **Verify password:**
   - Use `bcrypt.compare(inputPassword, storedPasswordHash)`
   - If incorrect → 401 (Email/password incorrect)
3. **Check account status:**
   - If `status = 'inactive'` → 401 (Account not activated)
   - If `status = 'deleted'` → 401 (Account locked)
4. **Generate tokens:**
   - **Access token:**
     - Payload: `{ sub: customer.id, email, type: 'customer' }`
     - Expiry: 15 minutes
   - **Refresh token:**
     - Payload: `{ sub: customer.id, type: 'refresh' }`
     - Expiry: 30 days
5. **Save refresh token:**
   - Store in database: `customer_id`, `token_hash`, `expires_at`
6. **Return tokens + customer info**

### 📝 Implementation Notes
- Failed login attempts are NOT rate-limited in current implementation (recommend adding)
- Email is case-insensitive
- Multiple refresh tokens can exist (multi-device support)
- Old refresh tokens are NOT automatically invalidated

### 🧪 cURL Example
```bash
curl -X POST https://api.yourshop.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### 💻 JavaScript Example
```javascript
const response = await fetch('https://api.yourshop.com/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});

const data = await response.json();

if (response.ok) {
  // Store tokens securely
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  // Store user info
  localStorage.setItem('user', JSON.stringify(data.customer));
  
  // Redirect to homepage
  window.location.href = '/';
} else {
  alert(data.message);
}
```

---

## 5. POST `/api/v1/auth/google`
**Đăng nhập/Đăng ký bằng Google**

### 📋 Overview
Backend nhận authorization code từ Google OAuth flow, exchange code để lấy user info, tự động đăng ký nếu chưa có tài khoản.

### 🔓 Authentication
**Public** - Không cần authentication

### 📥 Request

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `auth_code` | string | ✅ | Authorization code từ Google OAuth |

#### Request Example
```json
{
  "auth_code": "4/0AfJohXm..."
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đăng nhập Google thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "id": 123,
    "email": "user@gmail.com",
    "name": "Nguyễn Văn A",
    "status": "active",
    "email_verified": true,
    "google_id": "1234567890"
  },
  "is_new_user": false
}
```

#### Error Responses

**400 Bad Request - Auth code không hợp lệ**
```json
{
  "statusCode": 400,
  "message": "Authorization code không hợp lệ hoặc đã hết hạn",
  "error": "Bad Request"
}
```

**500 Internal Server Error - Google API error**
```json
{
  "statusCode": 500,
  "message": "Không thể kết nối với Google. Vui lòng thử lại sau.",
  "error": "Internal Server Error"
}
```

### 🔄 Logic Flow
1. **Exchange auth_code for tokens:**
   - Call Google Token API
   - POST to: `https://oauth2.googleapis.com/token`
   - Get: `id_token`, `access_token`
2. **Decode id_token:**
   - Extract: `email`, `name`, `picture`, `sub` (Google ID)
3. **Check if customer exists:**
   - Query by email OR google_id
4. **If customer exists:**
   - Login existing user
   - Update `google_id` if null
   - Update `last_login_at`
5. **If customer NOT exists:**
   - Create new customer:
     - `email` from Google
     - `name` from Google
     - `status = 'active'` (no activation required)
     - `email_verified = true`
     - `google_id = sub`
     - `password_hash = NULL` (no password)
   - Set `is_new_user = true`
6. **Generate tokens:**
   - Access token (15min)
   - Refresh token (30 days)
7. **Return response**

### 📝 Implementation Notes
- Google users don't have password (can't use email/password login)
- Email verification is automatic (trusted from Google)
- User can later set password to enable email/password login
- If email already exists (registered via email), link Google account

### 💻 Frontend Integration Example

**Step 1: Initialize Google OAuth**
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>

<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleGoogleResponse">
</div>
```

**Step 2: Handle callback**
```javascript
async function handleGoogleResponse(response) {
  const auth_code = response.code;
  
  // Send to backend
  const apiResponse = await fetch('https://api.yourshop.com/api/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_code })
  });
  
  const data = await apiResponse.json();
  
  if (apiResponse.ok) {
    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    if (data.is_new_user) {
      // Welcome new user
      alert('Chào mừng! Tài khoản đã được tạo.');
    }
    
    window.location.href = '/';
  } else {
    alert(data.message);
  }
}
```

---

## 6. POST `/api/v1/auth/refresh`
**Làm mới Access Token**

### 📋 Overview
Dùng refresh token (30 ngày) để lấy access token mới (15 phút). API này chạy ngầm để duy trì session.

### 🔓 Authentication
**Public** - Không cần bearer token (gửi refresh_token trong body)

### 📥 Request

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh_token` | string | ✅ | Refresh token từ login response |

#### Request Example
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Refresh token thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**401 Unauthorized - Refresh token không hợp lệ**
```json
{
  "statusCode": 401,
  "message": "Refresh token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}
```

### 🔄 Logic Flow
1. **Verify JWT refresh_token:**
   - Check signature and expiry
   - If invalid → 401
2. **Check token in database:**
   - Query: `SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()`
   - If not found → 401 (Token revoked or expired)
3. **Extract customer_id:**
   - From JWT payload: `sub`
4. **Check customer still active:**
   - If status != 'active' → 401
5. **Generate new access token:**
   - Expiry: 15 minutes
   - Same payload as login
6. **Rotate refresh token (optional):**
   - Generate new refresh token
   - Delete old token from database
   - Save new token
7. **Return new tokens**

### 📝 Implementation Notes
- **Token rotation:** Old refresh token is invalidated after use
- **Multi-device support:** Each device can have separate refresh token
- Frontend should call this API automatically when access token expires

### 💻 Auto-refresh Implementation

```javascript
// Axios interceptor for auto-refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get new access token
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken
        });
        
        // Update tokens
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed → logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## 7. POST `/api/v1/auth/logout`
**Đăng xuất**

### 📋 Overview
Vô hiệu hóa refresh token trong database. Client phải xóa tokens khỏi storage.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
Empty (no body required)

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đăng xuất thành công"
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT (req.user.sub)
2. Delete all refresh_tokens for this customer: `DELETE FROM refresh_tokens WHERE customer_id = ?`
3. Return success

### 📝 Implementation Notes
- Server-side: Invalidates ALL refresh tokens (logs out from all devices)
- Client-side: Must clear tokens from localStorage/cookies

### 💻 JavaScript Example
```javascript
await fetch('https://api.yourshop.com/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});

// Clear client storage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
localStorage.removeItem('user');

// Redirect to login
window.location.href = '/login';
```

---

## 8. POST `/api/v1/auth/forgot-password`
**Gửi yêu cầu đặt lại mật khẩu**

### 📋 Overview
Gửi email chứa link reset password. Luôn trả về success để tránh email enumeration attack.

### 🔓 Authentication
**Public**

### 📥 Request

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Email tài khoản |

#### Request Example
```json
{
  "email": "user@example.com"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi."
}
```

**Note:** Luôn trả về 200 dù email có tồn tại hay không

### 🔄 Logic Flow
1. Find customer by email
2. **If customer exists:**
   - Generate reset token (JWT, 1 hour expiry)
   - Save token hash in database
   - Send email with link: `{FRONTEND_URL}/reset-password?token=xxx`
3. **If customer NOT exists:**
   - Do nothing (silent fail for security)
4. Always return success message

### 📝 Implementation Notes
- **Security:** Prevents email enumeration attack
- Reset token expires after 1 hour
- Only 1 active reset token per customer (old tokens invalidated)

---

## 9. POST `/api/v1/auth/verify-reset-token`
**Xác thực token đặt lại mật khẩu**

### 📋 Overview
Frontend gọi API này để kiểm tra token có hợp lệ không trước khi hiển thị form reset password.

### 🔓 Authentication
**Public**

### 📥 Request
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Token hợp lệ",
  "email": "u***@example.com"
}
```

#### Error (401 Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}
```

---

## 10. POST `/api/v1/auth/reset-password`
**Đặt mật khẩu mới**

### 📋 Overview
Hoàn tất việc đặt lại mật khẩu với token hợp lệ.

### 🔓 Authentication
**Public** (but needs valid reset token)

### 📥 Request

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `token` | string | ✅ | - | Reset token từ email |
| `newPassword` | string | ✅ | Min 6 chars | Mật khẩu mới |

#### Request Example
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass456"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới."
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": ["newPassword must be at least 6 characters"],
  "error": "Bad Request"
}
```

### 🔄 Logic Flow
1. Verify reset token (JWT + database check)
2. Extract customer_id
3. Hash new password (bcrypt)
4. Update password in database
5. Invalidate reset token (mark as used)
6. Delete all refresh tokens (force re-login)
7. Return success

---

# Admin Authentication

## 11. POST `/api/v1/admin/auth/login`
**Đăng nhập Admin**

### 📋 Overview
Admin login with email/password. Returns access token (8 hours, no refresh token).

### 🔓 Authentication
**Public**

### 📥 Request

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | string | ✅ | Valid email | Email admin |
| `password` | string | ✅ | Min 6 chars | Mật khẩu |

#### Request Example
```json
{
  "email": "admin@shop.com",
  "password": "Admin123456"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Admin login successful.",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5Ac2hvcC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJ0eXBlIjoiYWRtaW4iLCJpYXQiOjE3MDE4MzY0MDAsImV4cCI6MTcwMTg2NTIwMH0.xxx",
  "admin": {
    "id": 1,
    "name": "Super Admin",
    "email": "admin@shop.com",
    "role": "super_admin"
  }
}
```

**JWT Payload:**
```json
{
  "sub": 1,
  "email": "admin@shop.com",
  "role": "super_admin",
  "type": "admin",
  "iat": 1701836400,
  "exp": 1701865200
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Thông tin đăng nhập không chính xác",
  "error": "Unauthorized"
}
```

### 🔄 Logic Flow
1. Find admin by email
2. Verify password with bcrypt
3. Generate access token (8 hours)
4. Return token + admin info

### 📝 Key Differences from Customer Login
- ❌ No refresh token (must re-login after 8 hours)
- ❌ No activation required
- ❌ No Google login
- ✅ JWT includes `type: 'admin'` and `role` field

---

## 12. GET `/api/v1/admin/auth/me`
**Lấy thông tin admin hiện tại**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Headers
```
Authorization: Bearer <admin_access_token>
```

### 📤 Response

#### Success (200 OK)
```json
{
  "id": 1,
  "name": "Admin User",
  "email": "admin@shop.com",
  "role": "admin",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## 13. POST `/api/v1/admin/auth/logout`
**Đăng xuất Admin**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Admin logout successful. Please clear access token on client."
}
```

### 📝 Note
- Server doesn't store admin tokens
- Client must clear token from storage

---

## 14. POST `/api/v1/admin/auth/create`
**Tạo tài khoản admin mới**

### 📋 Overview
Chỉ admin hiện tại có thể tạo admin mới.

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | ✅ | Min 2 chars | Tên admin |
| `email` | string | ✅ | Valid email, unique | Email |
| `password` | string | ✅ | Min 6 chars | Mật khẩu |
| `role` | string | ❌ | Enum: 'admin', 'super_admin' | Default: 'admin' |

#### Request Example
```json
{
  "name": "New Admin",
  "email": "newadmin@shop.com",
  "password": "SecurePass123",
  "role": "admin"
}
```

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Tạo admin thành công",
  "admin": {
    "id": 2,
    "name": "New Admin",
    "email": "newadmin@shop.com",
    "role": "admin"
  }
}
```

#### Error Responses

**409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Email đã được sử dụng",
  "error": "Conflict"
}
```

---

## 15. POST `/api/v1/admin/auth/reset-password`
**Reset password admin (Authenticated)**

### 📋 Overview
Admin đã login có thể reset password cho admin khác (hoặc chính mình).

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Email admin cần reset |
| `newPassword` | string | ✅ | Mật khẩu mới (min 6 chars) |

#### Request Example
```json
{
  "email": "admin@shop.com",
  "newPassword": "NewPassword123"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Reset password thành công",
  "admin": {
    "id": 1,
    "email": "admin@shop.com",
    "name": "Admin User"
  }
}
```

#### Error Responses

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy admin với email này",
  "error": "Not Found"
}
```

---

## 16. POST `/api/v1/admin/auth/public-reset-password`
**Reset password admin (Public - Không cần auth)**

### 📋 Overview
Reset password admin KHÔNG cần đăng nhập. Dành cho backoffice khi quên password.

### 🔓 Authentication
**Public** (but may require secret code)

### 📥 Request

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Email admin |
| `newPassword` | string | ✅ | Mật khẩu mới |
| `secret_code` | string | ❌ | Secret code (nếu `ADMIN_RESET_SECRET` được set trong env) |

#### Request Example
```json
{
  "email": "admin@shop.com",
  "newPassword": "NewSecurePassword789",
  "secret_code": "your-secret-code"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Reset password thành công",
  "admin": {
    "id": 1,
    "email": "admin@shop.com",
    "name": "Admin User"
  }
}
```

#### Error Responses

**400 Bad Request - Secret code sai**
```json
{
  "statusCode": 400,
  "message": "Secret code không đúng",
  "error": "Bad Request"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy admin với email này",
  "error": "Not Found"
}
```

### 🔄 Logic Flow
1. Check if `ADMIN_RESET_SECRET` env var is set
2. If set: Validate `secret_code` → 400 if incorrect
3. If not set: Skip validation (allow free reset)
4. Find admin by email → 404 if not found
5. Hash new password
6. Update password in database
7. Return success

### 📝 Use Case & Security
- **Development:** Không set `ADMIN_RESET_SECRET` để dễ test
- **Production:** PHẢI set `ADMIN_RESET_SECRET` để bảo vệ endpoint này
- Dành cho trường hợp quên password và không có admin khác để reset

---

## 🎯 Summary

### Customer Authentication Flow
```
Register → Activate (email) → Login → Get tokens → Use APIs → Refresh token → Logout
                                      ↓
                                  Forgot password → Reset password
```

### Admin Authentication Flow
```
Login (8h token) → Use APIs → Logout (or token expires)
```

### Token Comparison
| Feature | Customer Access | Customer Refresh | Admin Access |
|---------|----------------|------------------|--------------|
| **Expiry** | 15 minutes | 30 days | 8 hours |
| **Storage** | Client only | Client + Database | Client only |
| **Rotation** | Yes | Yes | N/A |
| **Multi-device** | Yes | Yes | Yes |

---

## 🔒 Security Best Practices

1. **Token Storage:**
   - Use `httpOnly` cookies (recommended)
   - Or secure localStorage with XSS protection
2. **HTTPS Only:**
   - Always use HTTPS in production
3. **Rate Limiting:**
   - Implement on login/register endpoints
   - Recommended: 5 attempts per 15 minutes
4. **Password Policy:**
   - Min 6 characters (consider increasing to 8-12)
   - Consider password strength validation
5. **JWT Secret:**
   - Use strong, random secret (min 32 characters)
   - Never commit to git
6. **Refresh Token:**
   - Store hash in database (not plain text)
   - Implement rotation on use
7. **Admin Reset:**
   - Always set `ADMIN_RESET_SECRET` in production

---

## 📊 HTTP Status Codes Reference

| Status | Usage in Auth Module |
|--------|---------------------|
| **200 OK** | Successful login, logout, password reset |
| **201 Created** | Registration successful, admin created |
| **302 Found** | Account activation redirect |
| **400 Bad Request** | Validation errors, invalid data |
| **401 Unauthorized** | Invalid credentials, expired token |
| **404 Not Found** | Customer/admin not found |
| **409 Conflict** | Email already exists |
| **500 Internal Error** | Google OAuth error, database error |

---

**✅ Authentication Module Complete!**

**Next Module:** [Products & Catalog →](./API_02_PRODUCTS_CATALOG.md)

---

*Last Updated: December 5, 2025*  
*Audited by: Senior Backend Developer*
