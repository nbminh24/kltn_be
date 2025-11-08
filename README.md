# KLTN E-commerce Backend

Backend API cho hệ thống E-commerce với tích hợp AI (Chatbot + Image Search)

## 📋 Tính Năng

- ✅ **51+ REST APIs** đầy đủ cho E-commerce
- ✅ **JWT Authentication** (Register, Login, Forgot/Reset Password)
- ✅ **AI Integration**
  - Rasa Chatbot (Proxy API)
  - FastAPI Image Search (pgvector)
- ✅ **Internal APIs** cho Rasa Action Server (bảo vệ bằng API Key)
- ✅ **Swagger Documentation** tại `/api-docs`
- ✅ **ESLint + Prettier** cho code quality
- ✅ **TypeORM** với PostgreSQL
- ✅ **17 Entities** tương ứng database schema

## 🛠️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL với pgvector extension
- **ORM**: TypeORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **AI Services**: Rasa (Chatbot), FastAPI (Image Search)

## 📦 Cài Đặt

### 1. Clone & Install Dependencies

```bash
cd kltn_be
npm install
```

### 2. Cấu Hình Environment

Copy file `.env.example` thành `.env` và điền thông tin:

```bash
cp .env.example .env
```

Nội dung file `.env`:

```env
# Database
DATABASE_URL="postgres://postgres:12345@localhost:5432/kltn_db"

# JWT
JWT_SECRET="YOUR_SECRET_KEY_HERE"

# AI Services
RASA_SERVER_URL="http://localhost:5005"
FASTAPI_SERVICE_URL="http://localhost:8000"

# Internal API Key (cho Rasa Action Server)
INTERNAL_API_KEY="YOUR_INTERNAL_KEY_HERE"

# Port
PORT=3000
```

### 3. Setup Database

Đảm bảo PostgreSQL đã chạy và database `kltn_db` đã được tạo với pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Chạy script SQL tạo bảng (trong file requirements của bạn).

### 4. Start Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server sẽ chạy tại: **http://localhost:3000**

## 📚 API Documentation

Truy cập Swagger UI tại: **http://localhost:3000/api-docs**

## 🔐 Authentication

### Public APIs (không cần token)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Protected APIs (cần JWT token)

Thêm header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Internal APIs (cần API Key)

APIs tại `/internal/*` yêu cầu header:

```
x-api-key: YOUR_INTERNAL_API_KEY
```

## 📁 Cấu Trúc Project

```
src/
├── common/                 # Guards, Decorators, Utils
│   ├── decorators/
│   ├── guards/
│   └── utils/
├── entities/               # 17 TypeORM Entities
├── modules/                # Feature Modules
│   ├── auth/              # 5 APIs (Register, Login, ...)
│   ├── users/             # 3 APIs (Profile, Change Password)
│   ├── products/          # 8 APIs (List, Detail, Reviews, AI)
│   ├── categories/        # 5 APIs
│   ├── cart/              # 5 APIs
│   ├── orders/            # 7 APIs
│   ├── wishlist/          # 3 APIs
│   ├── addresses/         # 4 APIs
│   ├── support/           # 5 APIs
│   ├── admin/             # 4+ APIs (Dashboard, CRUD)
│   ├── ai/                # 2 APIs (Chatbot, Image Search)
│   └── internal/          # 3+ APIs (cho Rasa)
├── app.module.ts
└── main.ts
```

## 🤖 AI Integration

### 1. Rasa Chatbot

API `POST /ai/chatbot` hoạt động như proxy:

- Nhận request từ Frontend
- Forward đến Rasa Server
- Trả response về Frontend

### 2. Image Search (FastAPI + pgvector)

API `POST /ai/search/image`:

- Nhận file ảnh
- Gửi đến FastAPI encode thành vector
- Query pgvector trong `product_images`
- Trả về sản phẩm tương tự

## 🔧 Scripts

```bash
# Development
npm run start:dev

# Build
npm run build

# Lint & Format
npm run lint
npm run format

# Type check
npm run typeorm
```

## 📊 Database Schema

17 tables:
- `users`, `categories`, `products`, `product_images`, `product_variants`
- `orders`, `order_items`, `addresses`, `promotions`, `reviews`
- `wishlist`, `cart_items`, `support_tickets`
- `chatbot_conversations`, `chatbot_messages`, `static_pages`
- `ai_recommendations`

## 📝 License

MIT

## 👤 Author

nbminh24
