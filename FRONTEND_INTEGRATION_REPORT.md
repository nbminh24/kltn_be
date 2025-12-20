# 📊 BÁO CÁO TÍCH HỢP IMAGE SEARCH - FRONTEND

## 📌 TỔNG QUAN

**Ngày:** 19/12/2025  
**Tính năng:** Image Search trong Chat  
**Trạng thái Backend:** ✅ Hoàn tất  
**Trạng thái Frontend:** ⏳ Cần implement

---

## 🎯 MỤC TIÊU

Cho phép user upload ảnh sản phẩm thời trang trong chat → Bot tự động tìm và trả về các sản phẩm tương tự với % độ tương đồng.

**Đặc điểm:**
- Tích hợp TRONG chat interface (không tách riêng)
- Upload ảnh → Bot response như hội thoại bình thường
- Hiển thị products với similarity badges
- Không cần training Rasa (backend tự xử lý)

---

## 🔧 BACKEND ĐÃ IMPLEMENT

### 1. Image Upload Service
**Endpoint:** `POST /api/v1/chat/upload-image`

```typescript
// Request
Content-Type: multipart/form-data
FormData: {
  file: File
}

// Response
{
  "url": "https://res.cloudinary.com/doticibcy/image/upload/v1766133200958/chat_images/1766133200958-image.jpg",
  "filename": "image.jpg",
  "size": 427715
}
```

### 2. Enhanced Chat Send Endpoint
**Endpoint:** `POST /api/v1/chat/send` (đã cập nhật)

```typescript
// Request (mới)
{
  "session_id": 44,
  "message": "Tìm sản phẩm tương tự",
  "image_url": "https://res.cloudinary.com/..."  // ← Field mới (optional)
}

// Response (khi có image_url)
{
  "customer_message": {
    "id": "648",
    "session_id": 44,
    "sender": "customer",
    "message": "Tìm sản phẩm tương tự",
    "created_at": "2025-12-19T08:33:22.847Z"
  },
  "bot_responses": [
    {
      "id": "649",
      "session_id": 44,
      "sender": "bot",
      "message": "🔍 Tôi đã tìm thấy 4 sản phẩm tương tự!\n\n1. Áo Thun Ringer...\n   💰 299,000đ\n   ✨ 100% tương đồng\n   🔗 /products/ao-thun-ringer...",
      "custom": {
        "type": "image_search_results",
        "products": [
          {
            "id": 493,
            "name": "Áo Thun Ringer Relaxed Fit Animal Mood",
            "price": 299000,
            "image": "https://res.cloudinary.com/...",
            "slug": "ao-thun-ringer-relaxed-fit-animal-mood",
            "similarity": 100
          }
        ]
      },
      "created_at": "2025-12-19T08:33:23.500Z"
    }
  ]
}
```

### 3. Backend Processing Flow

```
User upload ảnh
    ↓
Frontend: POST /upload-image → Cloudinary URL
    ↓
Frontend: POST /send với {message, image_url}
    ↓
Backend detect image_url:
    ├─> SKIP Rasa webhook
    ├─> Download ảnh từ Cloudinary
    ├─> Call Image Search Service (FastAPI)
    ├─> Query products từ database
    └─> Return bot message với products
    ↓
Frontend hiển thị products trong chat
```

---

## 💻 FRONTEND CẦN IMPLEMENT

### Phase 1: Core Integration (PRIORITY)

#### 1.1. Add Camera Button to Chat Input

```tsx
// components/ChatInput.tsx
<div className="chat-input-container">
  <input
    type="text"
    value={message}
    onChange={e => setMessage(e.target.value)}
    placeholder="Nhập tin nhắn hoặc upload ảnh..."
  />
  
  {/* NEW: Camera/Upload button */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleImageSelect}
    style={{ display: 'none' }}
  />
  
  <button 
    onClick={() => fileInputRef.current?.click()}
    className="btn-camera"
  >
    📷
  </button>
  
  <button onClick={handleSendMessage}>
    Gửi
  </button>
</div>
```

#### 1.2. Implement Image Upload Handler

```typescript
// lib/services/imageService.ts
export async function uploadChatImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    'http://localhost:3001/api/v1/chat/upload-image',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}` // Nếu cần auth
      },
      body: formData
    }
  );
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  const data = await response.json();
  return data.url; // Cloudinary URL
}
```

#### 1.3. Handle Image Selection

```typescript
// components/ChatInput.tsx
const [isUploading, setIsUploading] = useState(false);

const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validate
  if (!file.type.startsWith('image/')) {
    toast.error('Chỉ chấp nhận file ảnh');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Ảnh không vượt quá 10MB');
    return;
  }
  
  try {
    setIsUploading(true);
    
    // 1. Upload to Cloudinary
    const imageUrl = await uploadChatImage(file);
    
    // 2. Send message with image_url
    await sendMessage({
      session_id: currentSessionId,
      message: '📷 Tìm sản phẩm tương tự với ảnh này',
      image_url: imageUrl  // ← KEY: Kèm URL ảnh
    });
    
  } catch (error) {
    console.error('Image search failed:', error);
    toast.error('Không thể xử lý ảnh. Thử lại.');
  } finally {
    setIsUploading(false);
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};
```

#### 1.4. Update Send Message Function

```typescript
// lib/stores/useChatStore.ts hoặc services/chatService.ts
interface SendMessageDto {
  session_id: number;
  message: string;
  image_url?: string;  // ← NEW field
}

async function sendMessage(dto: SendMessageDto) {
  const response = await fetch('http://localhost:3001/api/v1/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(dto)
  });
  
  const data = await response.json();
  
  // Add messages to chat
  addMessage(data.customer_message);
  data.bot_responses.forEach(msg => addMessage(msg));
  
  return data;
}
```

#### 1.5. Render Image Search Results

```tsx
// components/ChatMessage.tsx
const ChatMessage = ({ message }) => {
  // Check if this is image search result
  const isImageSearchResult = message.custom?.type === 'image_search_results';
  
  if (message.sender === 'bot' && isImageSearchResult) {
    const products = message.custom.products;
    
    return (
      <div className="bot-message image-search-result">
        {/* Text message */}
        <div className="message-text">
          {message.message}
        </div>
        
        {/* Product cards */}
        <div className="products-grid">
          {products.map(product => (
            <Link 
              key={product.id}
              href={`/products/${product.slug}`}
              className="product-card"
            >
              <div className="product-image-wrapper">
                <img 
                  src={product.image} 
                  alt={product.name}
                />
                
                {/* Similarity badge */}
                <div className={`similarity-badge ${getSimilarityColorClass(product.similarity)}`}>
                  {product.similarity}%
                </div>
              </div>
              
              <h4 className="product-name">{product.name}</h4>
              <p className="product-price">
                {product.price.toLocaleString('vi-VN')}đ
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  
  // Normal message
  return (
    <div className={`message ${message.sender}`}>
      <p>{message.message}</p>
    </div>
  );
};

// Helper function
function getSimilarityColorClass(similarity: number): string {
  if (similarity >= 80) return 'similarity-high';     // Green
  if (similarity >= 50) return 'similarity-medium';   // Yellow
  if (similarity >= 30) return 'similarity-low';      // Orange
  return 'similarity-very-low';                       // Gray
}
```

#### 1.6. Add Styles

```css
/* styles/chat.css */
.btn-camera {
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s;
}

.btn-camera:hover {
  background: #e5e7eb;
  transform: scale(1.1);
}

.btn-camera:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Product grid in chat */
.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

@media (min-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.product-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.product-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
}

.product-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.similarity-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.similarity-high {
  background: #10b981;
}

.similarity-medium {
  background: #f59e0b;
}

.similarity-low {
  background: #ef4444;
}

.similarity-very-low {
  background: #6b7280;
}

.product-name {
  font-size: 14px;
  font-weight: 500;
  margin: 8px 0 4px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  margin: 0;
}

/* Loading state */
.uploading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
}
```

---

## 📝 CHECKLIST IMPLEMENTATION

### Must Have (Phase 1)
- [ ] Thêm camera button vào chat input
- [ ] Implement `uploadChatImage()` service
- [ ] Handle image file selection & validation
- [ ] Update `sendMessage()` để support `image_url`
- [ ] Render bot message với product cards
- [ ] Add similarity badge với màu sắc
- [ ] Style responsive cho mobile & desktop
- [ ] Loading state khi upload & search
- [ ] Error handling (upload fail, search fail, no results)

### Nice to Have (Phase 2)
- [ ] Image preview trước khi gửi
- [ ] Compress ảnh trước upload (giảm size)
- [ ] Animation khi hiển thị products
- [ ] Toast notifications cho user feedback
- [ ] Retry mechanism khi upload fail
- [ ] Cache image URLs trong session

### Advanced (Phase 3)
- [ ] Crop/edit ảnh trước upload
- [ ] Multiple images support
- [ ] Save search history
- [ ] Share results
- [ ] Compare products side-by-side

---

## 🧪 TESTING

### Test Case 1: Upload & Search Success

**Steps:**
1. Click camera button
2. Select ảnh sản phẩm từ catalog
3. Verify upload progress indicator
4. Wait for bot response (~1-2s)
5. Verify products grid hiển thị
6. Check similarity badges đúng màu
7. Click vào product → navigate to detail page

**Expected:**
- Upload thành công
- Bot message với 4-10 products
- Products có similarity từ cao đến thấp
- Có thể click vào từng product

### Test Case 2: Upload Image Không Có Trong Catalog

**Steps:**
1. Upload random fashion image
2. Wait for response

**Expected:**
- Bot message: "Xin lỗi, tôi không tìm thấy sản phẩm tương tự..."

### Test Case 3: Upload File Không Hợp Lệ

**Steps:**
1. Try upload PDF/video file

**Expected:**
- Error message: "Chỉ chấp nhận file ảnh"
- Upload không trigger

### Test Case 4: File Quá Lớn

**Steps:**
1. Upload file > 10MB

**Expected:**
- Error message: "Ảnh không vượt quá 10MB"

### Test Case 5: Network Error

**Steps:**
1. Disconnect internet
2. Try upload image

**Expected:**
- Error message: "Có lỗi xảy ra. Thử lại."
- Không crash app

---

## 🔍 DEBUGGING

### Backend Logs để Monitor

```
✅ Cloudinary configured: doticibcy
🖼️ Detected image in message, processing image search...
📥 Downloading image from: https://res.cloudinary.com/...
🔍 Searching similar products for image: chat-image.jpg
✅ Image search completed in 245ms, found 4 results
Found 4 similar products: 493, 464, 383, 475
✅ Returning 4 products with details
✅ Image search completed, found 4 products
```

### KHÔNG nên thấy log này (vì skip Rasa):
```
❌ [Chat] Calling Rasa webhook: http://localhost:5005/webhooks/rest/webhook
```

### Frontend Console Logs để Debug

```javascript
console.log('[Chat] Uploading image...');
console.log('[Chat] Image uploaded:', imageUrl);
console.log('[Chat] Sending message with image_url:', imageUrl);
console.log('[Chat] Bot response:', response);
console.log('[Chat] Products found:', response.bot_responses[0].custom.products);
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### Issue 1: Upload lên placeholder.com
**Cause:** Frontend chưa update endpoint  
**Fix:** Đổi từ mock endpoint → `POST /api/v1/chat/upload-image`

### Issue 2: Backend vẫn gọi Rasa
**Cause:** Backend chưa restart hoặc `image_url` không được gửi  
**Fix:** 
- Restart backend
- Verify `image_url` có trong request payload
- Check backend log có `🖼️ Detected image in message`

### Issue 3: Products không hiển thị
**Cause:** Frontend không check `message.custom.type`  
**Fix:** Thêm condition check `custom?.type === 'image_search_results'`

### Issue 4: CORS error khi upload
**Cause:** Backend CORS chưa config cho multipart  
**Fix:** Backend đã config sẵn, check lại `FRONTEND_URL` trong .env

### Issue 5: Image quá lâu load
**Cause:** Cloudinary serve ảnh gốc (chưa optimize)  
**Fix:** Dùng Cloudinary transformation:
```typescript
// Thay vì:
<img src={product.image} />

// Dùng:
<img src={optimizeCloudinaryUrl(product.image, { width: 400 })} />
```

---

## 📊 PERFORMANCE METRICS

**Target Performance:**
- Upload ảnh: < 1s
- Image search: < 2s (AI processing)
- Total user experience: < 3s từ upload đến hiển thị results

**Actual Performance (tested):**
- Upload to Cloudinary: ~500ms
- Image Search Service: ~1s
- Database query: ~100ms
- Total: ~1.5-2s ✅

---

## 🔗 API ENDPOINTS SUMMARY

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/v1/chat/upload-image` | POST | Upload ảnh lên Cloudinary | Public |
| `/api/v1/chat/send` | POST | Gửi message (có thể kèm image_url) | Public |
| `/api/v1/chat/history` | GET | Lấy chat history | Public |

---

## 📚 REFERENCE DOCUMENTS

1. **FRONTEND_CHATBOT_IMAGE_SEARCH.md** - Detailed technical specs
2. **IMAGE_SEARCH_INTEGRATION.md** - Backend architecture
3. **FRONTEND_IMAGE_SEARCH_SUMMARY.md** - Quick start guide

---

## ✅ BACKEND STATUS

**Hoàn tất:**
- ✅ Cloudinary upload service
- ✅ Image Search Service integration (FastAPI)
- ✅ Auto-detect image_url trong chat
- ✅ Skip Rasa khi có image
- ✅ Download & process ảnh từ URL
- ✅ Query & format products
- ✅ Return bot message với structured data

**Database:**
- ✅ 12,263 sản phẩm đã indexed
- ✅ Image Search Service running

**Tested:**
- ✅ Upload endpoint working
- ✅ Image search returning 4 products
- ✅ Similarity scores correct (100% for exact match)

---

## 🎯 NEXT STEPS FOR FRONTEND

1. **Implement core features** (Phase 1 checklist)
2. **Test với test image** từ backend
3. **UI/UX review** với product team
4. **Mobile testing** (camera capture)
5. **Performance optimization** nếu cần

---

## 📞 SUPPORT

**Backend Team Contact:**
- Issues: GitHub Issues
- Questions: Team chat
- API Docs: http://localhost:3001/api (Swagger)

**Backend Ready:** ✅  
**Frontend Action Required:** ⏳

---

**Last Updated:** 19/12/2025  
**Version:** 1.0  
**Author:** Backend Team
