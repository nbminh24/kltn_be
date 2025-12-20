# IMAGE SEARCH TRONG CHATBOT - Frontend Requirements

## Tổng quan

Image search được tích hợp TRONG chat interface như một phần của hội thoại với bot. User upload ảnh → Bot trả về sản phẩm tương tự trong chat history.

---

## Flow hoạt động

```
1. User click button 📷 camera trong chat
2. Chọn/chụp ảnh
3. Frontend upload ảnh lên storage (Supabase/Cloudinary)
4. Lấy image_url
5. Gửi qua chat API:
   POST /api/v1/chat/send
   {
     session_id: 40,
     message: "Tìm sản phẩm tương tự",
     image_url: "https://..." ← Kèm URL ảnh
   }
6. Backend detect image_url:
   - Download ảnh
   - Call Image Search Service
   - Query products
   - SKIP Rasa
7. Return bot response với products list
8. Frontend hiển thị trong chat history
```

---

## API Changes

### POST `/api/v1/chat/send` (Updated)

**Request:**
```typescript
{
  session_id: number;
  message: string;              // "Tìm sản phẩm tương tự" hoặc text khác
  image_url?: string;           // ← NEW: Optional image URL
}
```

**Response (khi có image_url):**
```typescript
{
  customer_message: {
    id: number,
    session_id: number,
    sender: "customer",
    message: "Tìm sản phẩm tương tự",
    created_at: string
  },
  bot_responses: [
    {
      id: number,
      session_id: number,
      sender: "bot",
      message: "🔍 Tôi đã tìm thấy 4 sản phẩm tương tự!...",
      metadata: {
        type: "image_search_results",
        products: [
          {
            id: 493,
            name: "Áo Thun Ringer...",
            price: 299000,
            image: "https://...",
            slug: "ao-thun-ringer...",
            similarity: 100  // Percentage
          }
        ]
      },
      created_at: string
    }
  ]
}
```

---

## Frontend Implementation

### 1. Upload ảnh và lấy URL

```typescript
// Sử dụng endpoint upload hiện có
const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    'http://localhost:3001/api/v1/chat/upload-image',
    {
      method: 'POST',
      body: formData
    }
  );
  
  const data = await response.json();
  return data.url; // Cloudinary/Supabase URL
}
```

### 2. Gửi message kèm image_url

```typescript
const sendImageSearch = async (file: File) => {
  try {
    setLoading(true);
    
    // 1. Upload ảnh
    const imageUrl = await uploadImage(file);
    
    // 2. Gửi qua chat API với image_url
    const response = await fetch(
      'http://localhost:3001/api/v1/chat/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: '📷 Tìm sản phẩm tương tự với ảnh này',
          image_url: imageUrl  // ← Kèm URL ảnh
        })
      }
    );
    
    const data = await response.json();
    
    // 3. Add messages vào chat history (như bình thường)
    addMessageToChat(data.customer_message);
    data.bot_responses.forEach(msg => addMessageToChat(msg));
    
  } catch (error) {
    console.error('Image search failed:', error);
    showError('Không thể xử lý ảnh. Thử lại.');
  } finally {
    setLoading(false);
  }
}
```

### 3. UI Component

```tsx
// ChatInput.tsx
const ChatInput = () => {
  const [message, setMessage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate
    if (!file.type.startsWith('image/')) {
      alert('Chỉ chấp nhận file ảnh');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Ảnh không vượt quá 10MB');
      return;
    }
    
    // Send image search
    await sendImageSearch(file);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="chat-input">
      {/* Text input */}
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Nhập tin nhắn..."
      />
      
      {/* Camera/Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"  // Mobile camera
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploadingImage}
        className="btn-icon"
      >
        📷
      </button>
      
      {/* Send button */}
      <button onClick={handleSendTextMessage}>
        Gửi
      </button>
    </div>
  );
}
```

### 4. Hiển thị bot response

```tsx
// ChatMessage.tsx
const ChatMessage = ({ message }) => {
  const isImageSearchResult = message.metadata?.type === 'image_search_results';
  
  if (isImageSearchResult) {
    const products = message.metadata.products;
    
    return (
      <div className="bot-message image-search-result">
        {/* Text message */}
        <p>{message.message}</p>
        
        {/* Product cards */}
        <div className="products-grid">
          {products.map(product => (
            <a 
              key={product.id}
              href={`/products/${product.slug}`}
              className="product-card"
            >
              <img src={product.image} alt={product.name} />
              
              {/* Similarity badge */}
              <div className={`badge ${getSimilarityColor(product.similarity)}`}>
                {product.similarity}% tương đồng
              </div>
              
              <h4>{product.name}</h4>
              <p className="price">
                {product.price.toLocaleString('vi-VN')}đ
              </p>
            </a>
          ))}
        </div>
      </div>
    );
  }
  
  // Normal text message
  return (
    <div className="bot-message">
      <p>{message.message}</p>
    </div>
  );
}

function getSimilarityColor(similarity: number) {
  if (similarity >= 80) return 'green';
  if (similarity >= 50) return 'yellow';
  if (similarity >= 30) return 'orange';
  return 'gray';
}
```

---

## UI/UX Details

### Loading State

```tsx
{isUploadingImage && (
  <div className="uploading-indicator">
    <Spinner />
    <span>Đang tìm kiếm sản phẩm...</span>
  </div>
)}
```

### Message Preview (optional)

```tsx
// Preview ảnh trước khi gửi
{selectedImage && (
  <div className="image-preview">
    <img src={URL.createObjectURL(selectedImage)} />
    <button onClick={handleConfirmSearch}>
      Tìm kiếm
    </button>
    <button onClick={handleCancelImage}>
      Hủy
    </button>
  </div>
)}
```

### Product Card trong Chat

```css
.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.product-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  position: relative;
}

.product-card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
}

.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge.green {
  background: #10b981;
  color: white;
}

.badge.yellow {
  background: #f59e0b;
  color: white;
}
```

---

## Backend Response Examples

### Success - Found products

```json
{
  "customer_message": {
    "id": 1234,
    "session_id": 40,
    "sender": "customer",
    "message": "Tìm sản phẩm tương tự",
    "created_at": "2025-12-19T14:00:00Z"
  },
  "bot_responses": [
    {
      "id": 1235,
      "session_id": 40,
      "sender": "bot",
      "message": "🔍 Tôi đã tìm thấy 4 sản phẩm tương tự! Đây là những sản phẩm phù hợp nhất:\n\n1. Áo Thun Ringer Relaxed Fit Animal Mood\n   💰 299,000đ\n   ✨ 100% tương đồng\n   🔗 /products/ao-thun-ringer-relaxed-fit-animal-mood\n\n...",
      "metadata": {
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
      "created_at": "2025-12-19T14:00:02Z"
    }
  ]
}
```

### No results found

```json
{
  "bot_responses": [
    {
      "message": "😔 Xin lỗi, tôi không tìm thấy sản phẩm tương tự nào. Bạn có thể thử với ảnh khác hoặc mô tả sản phẩm bạn muốn tìm.",
      "metadata": null
    }
  ]
}
```

### Error

```json
{
  "bot_responses": [
    {
      "message": "Xin lỗi, có lỗi xảy ra khi xử lý hình ảnh. Vui lòng thử lại hoặc gửi ảnh khác."
    }
  ]
}
```

---

## Comparison: Keyword Search vs Image Search

| Feature | Keyword Search | Image Search |
|---------|---------------|--------------|
| Input | Text | Image file |
| Endpoint | `POST /chat/send` | `POST /chat/send` (same) |
| Field | `message` only | `message` + `image_url` |
| Bot processing | Rasa NLU | Image Search Service |
| Response | Text + entities | Product list + similarity |
| Display | Text bubbles | Product cards |

**Flow giống nhau:** Cùng đi qua `POST /chat/send`, backend tự detect và route.

---

## Testing

### Test case 1: Upload ảnh hợp lệ

```typescript
// Test với ảnh trong catalog
const testImage = 'https://res.cloudinary.com/doticibcy/image/upload/v1765594794/.../Tr_ngc_d_tr_c_664eca4e-b22a-4540-ac8a-220e2ba551a9_cxkzhm.png';

await fetch('http://localhost:3001/api/v1/chat/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: 40,
    message: 'Tìm sản phẩm tương tự',
    image_url: testImage
  })
});

// Expected: 4 products, similarity 100% for product 493
```

### Test case 2: Upload ảnh không có trong catalog

```typescript
// Random fashion image
// Expected: Bot message "Không tìm thấy sản phẩm tương tự"
```

### Test case 3: Invalid image URL

```typescript
// Invalid URL
// Expected: Error message from bot
```

---

## Mobile Considerations

```tsx
// Mobile: Cho phép chụp ảnh trực tiếp
<input
  type="file"
  accept="image/*"
  capture="environment"  // Camera sau
  onChange={handleImageSelect}
/>

// iOS Safari: Cần test upload behavior
// Android Chrome: Cần test camera permissions
```

---

## Performance

- Upload ảnh: ~500ms (depends on size/network)
- Image Search Service: ~1s (AI processing)
- Total: ~1.5s từ upload đến hiển thị results

**Show loading state** để user biết đang xử lý.

---

## Error Handling

```typescript
try {
  const imageUrl = await uploadImage(file);
  await sendMessage({ 
    session_id, 
    message: 'Tìm sản phẩm tương tự',
    image_url: imageUrl 
  });
} catch (error) {
  if (error.status === 503) {
    showError('Dịch vụ tìm kiếm đang bảo trì');
  } else if (error.message.includes('download')) {
    showError('Không thể tải ảnh. Thử lại.');
  } else {
    showError('Có lỗi xảy ra. Thử lại.');
  }
}
```

---

## Summary

✅ **Image search TRONG chat flow**
- Không tách riêng UI
- Dùng chung endpoint `POST /chat/send`
- Thêm field `image_url` optional
- Bot response hiển thị trong chat history
- Products có metadata đặc biệt để render cards

✅ **Backend đã sẵn sàng**
- Detect `image_url` tự động
- Download ảnh từ URL
- Call Image Search Service
- Skip Rasa khi có image
- Return products trong bot message

✅ **Frontend cần làm**
1. Upload ảnh → lấy URL
2. Gửi qua `POST /chat/send` với `image_url`
3. Render bot response với product cards
4. Handle loading & errors
