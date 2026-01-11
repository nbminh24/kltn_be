# 🔍 Debug Intent Tracking Issue

## Vấn Đề
Intent không được lưu vào database từ Rasa response.

---

## ✅ Step 1: Verify Migration Đã Chạy

Kiểm tra xem column `intent` đã tồn tại trong database chưa:

```sql
-- Chạy query này trong PostgreSQL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages' AND column_name = 'intent';
```

**Expected result:**
```
column_name | data_type        | is_nullable
------------|------------------|------------
intent      | character varying| YES
```

**Nếu KHÔNG có kết quả** → Migration chưa chạy, cần chạy:
```bash
npm run migration:run
```

Hoặc chạy SQL trực tiếp:
```sql
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS intent VARCHAR(255) NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent ON chat_messages(intent);
```

---

## ✅ Step 2: Restart Backend

Sau khi chạy migration, **RESTART backend server**:

```bash
# Stop server (Ctrl+C)
# Start lại
npm run start:dev
```

---

## ✅ Step 3: Test Lại Với Debug Logs

Gửi message test qua chat:

```
User: "tôi muốn 1 chiếc áo meow"
```

**Kiểm tra logs trong terminal backend:**

### Log 1: Rasa Full Response
```
[Chat] 🔍 DEBUG - Full Rasa response: [
  {
    "text": "...",
    "metadata": { "intent": "product_inquiry" },  // ← CHECK THIS
    "custom": { ... }
  }
]
```

### Log 2: Intent Extraction
```
[Chat] 🎯 Intent extraction: {
  hasMetadata: true,
  metadataIntent: "product_inquiry",  // ← CHECK THIS
  hasCustom: false,
  customIntent: undefined,
  extractedIntent: "product_inquiry"  // ← SHOULD NOT BE NULL
}
```

### Log 3: Saved to DB
```
[Chat] 💾 Saved message to DB: {
  id: 123,
  sender: "bot",
  intent: "product_inquiry",  // ← CHECK THIS (should not be null)
  hasCustom: true
}
```

---

## 🔍 Analyze Logs

### Scenario 1: `extractedIntent: null`
**Problem:** Rasa không gửi intent trong response

**Check Rasa logs:** Có dòng này không?
```python
dispatcher.utter_message(
    text="...",
    metadata={"intent": intent_name}  # ← Team AI đã thêm chưa?
)
```

**Fix:** Liên hệ team AI, họ cần thêm intent vào metadata như đã hướng dẫn.

---

### Scenario 2: `extractedIntent` có giá trị nhưng `saved.intent` = null
**Problem:** Database column chưa tồn tại hoặc backend chưa restart

**Fix:**
1. Chạy lại migration
2. Restart backend server

---

### Scenario 3: Log không hiển thị "🎯 Intent extraction"
**Problem:** Code chưa được reload

**Fix:** Restart backend server

---

## 🧪 Test Query Database

Sau khi test, kiểm tra database:

```sql
-- Check messages mới nhất có intent không
SELECT id, sender, message, intent, created_at
FROM chat_messages
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Messages từ bot phải có `intent` không null.

---

## 📋 Checklist

- [ ] Migration đã chạy (`intent` column tồn tại)
- [ ] Backend đã restart sau khi chạy migration
- [ ] Rasa đã implement intent trong metadata (team AI confirm)
- [ ] Test và xem full logs
- [ ] Verify trong database có intent

---

## 🆘 Nếu Vẫn Không Work

1. **Copy full logs** từ backend khi test
2. **Copy output** của query database
3. **Share** để tôi debug tiếp
