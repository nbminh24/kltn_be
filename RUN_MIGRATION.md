# 🚀 Chạy Migration - Thêm Intent Tracking

## Option 1: Chạy Migration (Khuyến nghị)

```bash
npm run migration:run
```

Hoặc nếu dùng TypeORM CLI trực tiếp:

```bash
npm run typeorm migration:run -- -d src/config/typeorm.config.ts
```

## Option 2: Chạy SQL Trực Tiếp

Nếu migration không chạy được, copy SQL trong file `ADD_INTENT_COLUMN.sql` và chạy trực tiếp trên PostgreSQL.

---

## ✅ Verification

Sau khi chạy migration, kiểm tra:

```sql
-- Kiểm tra column đã được thêm
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages' AND column_name = 'intent';

-- Kiểm tra index đã được tạo
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'chat_messages' AND indexname = 'idx_chat_messages_intent';
```

Expected output:
- Column `intent`: type `character varying`, length `255`, nullable `YES`
- Index `idx_chat_messages_intent` exists

---

## 🔄 Rollback (Nếu Cần)

```bash
npm run migration:revert
```

Hoặc chạy SQL:
```sql
DROP INDEX IF EXISTS idx_chat_messages_intent;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS intent;
```
