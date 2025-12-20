# IMAGE SEARCH INTEGRATION - Backend Documentation

## Tổng quan

Backend NestJS đã được tích hợp với Image Search Service (FastAPI) để hỗ trợ tìm kiếm sản phẩm thời trang qua hình ảnh.

## Kiến trúc

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│     User     │──────▶│   Backend        │──────▶│ Image Search │
│   (Chat)     │◀──────│   NestJS         │◀──────│   Service    │
│              │       │                  │       │  (FastAPI)   │
└──────────────┘       │  - Chat API      │       │              │
                       │  - Product Query │       │  - Swin Model│
                       │  - Format Rasa   │       │  - FAISS     │
                       └──────────────────┘       └──────────────┘
```

## Components đã implement

### 1. ImageSearchService (`src/modules/chat/image-search.service.ts`)

Service chịu trách nhiệm gọi Image Search Service (FastAPI).

**Methods:**
- `searchByImage(imageBuffer, filename)` - Gửi ảnh đến Image Search Service
- `healthCheck()` - Kiểm tra service availability

**Config:**
- `FASTAPI_SERVICE_URL` - URL của Image Search Service (default: http://localhost:8000)
- `IMAGE_SEARCH_API_KEY` - API key để authenticate

### 2. ChatService - Image Search Methods

**`searchProductsByImage(imageBuffer, filename)`**
- Call Image Search Service → nhận product IDs
- Query database → lấy thông tin sản phẩm (name, price, thumbnail, slug)
- Map và preserve order theo similarity score
- Return: `ProductSearchResultDto[]`

**`formatAsRasaCarousel(products)`**
- Format kết quả thành Rasa carousel
- Return format:
  - `text`: Message chính
  - `custom`: Custom data với product details + similarity %
  - `attachment`: Rasa generic template với buttons

### 3. API Endpoints

#### POST `/api/v1/chat/search-by-image`
**Mục đích:** Direct image search, trả JSON data

**Request:**
```
Content-Type: multipart/form-data
- image: file
```

**Response:**
```json
{
  "success": true,
  "total": 10,
  "products": [
    {
      "id": 123,
      "name": "Áo Sơ Mi Kẻ Sọc",
      "selling_price": 299000,
      "thumbnail_url": "https://...",
      "slug": "ao-so-mi-ke-soc",
      "similarity_score": 0.95,
      "matched_image_url": "https://..."
    }
  ]
}
```

#### POST `/api/v1/chat/search-by-image/rasa`
**Mục đích:** Endpoint cho Rasa custom action, trả Rasa carousel format

**Request:** Giống endpoint trên

**Response:**
```json
{
  "text": "🔍 Tôi đã tìm thấy 10 sản phẩm tương tự!...",
  "custom": {
    "type": "image_search_results",
    "products": [...]
  },
  "attachment": {
    "type": "template",
    "payload": {
      "template_type": "generic",
      "elements": [
        {
          "title": "Áo Sơ Mi Kẻ Sọc",
          "subtitle": "299,000đ • 95% tương đồng",
          "image_url": "https://...",
          "buttons": [
            {
              "type": "web_url",
              "url": "http://localhost:3000/products/ao-so-mi-ke-soc",
              "title": "Xem chi tiết"
            }
          ]
        }
      ]
    }
  }
}
```

## Workflow End-to-End

### 1. User upload ảnh qua chat

```
User → Upload ảnh (base64 hoặc file)
```

### 2. Frontend gửi đến Backend

```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('http://localhost:3001/api/v1/chat/search-by-image/rasa', {
  method: 'POST',
  body: formData
});
```

### 3. Backend xử lý

```typescript
// ChatController
searchByImageForRasa(@UploadedFile() file) {
  const products = await chatService.searchProductsByImage(file.buffer, file.originalname);
  return chatService.formatAsRasaCarousel(products);
}

// ChatService.searchProductsByImage()
1. Call ImageSearchService.searchByImage()
   → POST http://localhost:8000/search with image
   → Receive: [{ product_id, image_url, similarity_score }]

2. Extract product_ids from results

3. Query database:
   SELECT * FROM products 
   WHERE id IN (...) AND status='active'

4. Map và merge data:
   products[].id → add similarity_score, matched_image_url

5. Return ProductSearchResultDto[]
```

### 4. Image Search Service (FastAPI)

```python
# FastAPI side (đã implement bởi team Image Search)
@app.post("/search")
async def search(file: UploadFile):
    # 1. Load image
    image = Image.open(file.file)
    
    # 2. Extract vector
    vector = model.extract_features(image)  # [768]
    
    # 3. FAISS search
    distances, indices = faiss_index.search(vector, k=50)
    
    # 4. Deduplicate by product_id
    results = deduplicate(indices, metadata)[:10]
    
    return {
        "success": true,
        "results": results
    }
```

### 5. Backend format & return

```typescript
// ChatService.formatAsRasaCarousel()
{
  text: "🔍 Tôi đã tìm thấy 10 sản phẩm tương tự!",
  custom: { type: 'image_search_results', products: [...] },
  attachment: { /* Rasa carousel */ }
}
```

## Database Schema sử dụng

### Products table
```sql
SELECT 
  id,              -- bigint
  name,            -- varchar
  selling_price,   -- numeric
  thumbnail_url,   -- text
  slug,            -- varchar
  status           -- varchar ('active')
FROM products
WHERE 
  id IN (...)
  AND status = 'active'
  AND deleted_at IS NULL
```

## Error Handling

### ImageSearchService không available
```
Status: 503 Service Unavailable
Response: {
  "message": "Image Search Service is not available"
}
```

### Không tìm thấy sản phẩm
```
Response: {
  "text": "Xin lỗi, tôi không tìm thấy sản phẩm tương tự nào..."
}
```

### File không hợp lệ
```
Status: 400 Bad Request
Response: {
  "message": "No image file provided"
}
```

## Configuration

### .env variables
```bash
FASTAPI_SERVICE_URL="http://localhost:8000"
IMAGE_SEARCH_API_KEY="KhoaBiMatIS"
FRONTEND_URL="http://localhost:3000"
```

### Image Search Service cần expose:
- `POST /search` - Main search endpoint
- `GET /health` - Health check endpoint

## Testing

### 1. Test Image Search Service availability
```bash
curl http://localhost:8000/health
```

### 2. Test direct search
```bash
curl -X POST http://localhost:3001/api/v1/chat/search-by-image \
  -F "image=@test-image.jpg"
```

### 3. Test Rasa format endpoint
```bash
curl -X POST http://localhost:3001/api/v1/chat/search-by-image/rasa \
  -F "image=@test-image.jpg"
```

## Rasa Integration (Next Step)

### Rasa Custom Action Example

```python
# actions.py (Rasa side - chưa implement)
from rasa_sdk import Action
import requests

class ActionImageSearch(Action):
    def name(self) -> str:
        return "action_image_search"
    
    def run(self, dispatcher, tracker, domain):
        # Get image từ user message
        image_url = tracker.latest_message.get('metadata', {}).get('image_url')
        
        if not image_url:
            dispatcher.utter_message(text="Vui lòng gửi ảnh để tìm kiếm")
            return []
        
        # Call backend endpoint
        response = requests.post(
            'http://localhost:3001/api/v1/chat/search-by-image/rasa',
            files={'image': download_image(image_url)}
        )
        
        result = response.json()
        
        # Gửi carousel về cho user
        dispatcher.utter_message(
            text=result['text'],
            attachment=result['attachment'],
            custom=result['custom']
        )
        
        return []
```

### Rasa Domain & Rules

```yaml
# domain.yml
actions:
  - action_image_search

# rules.yml  
rules:
  - rule: Image search when user uploads photo
    steps:
      - intent: send_image
      - action: action_image_search
```

## Performance Metrics

- Image Search Service response: ~250ms
- Database query: ~50ms
- Total backend processing: <500ms
- Target: User nhận kết quả trong <1 giây

## Monitoring

Backend logs bao gồm:
```
🖼️ Processing image search request: image.jpg
🔍 Searching similar products for image: image.jpg
✅ Image search completed in 245ms, found 10 results
Found 10 similar products: 123, 456, 789...
✅ Returning 10 products with details
```

## Troubleshooting

### Lỗi: "Image Search Service is not available"
- Check Image Search Service đang chạy: `curl http://localhost:8000/health`
- Check `FASTAPI_SERVICE_URL` trong `.env`

### Lỗi: "No similar products found"
- FAISS index có đủ dữ liệu không?
- Ảnh upload có hợp lệ không?

### Response trả về products = []
- Check products có `status='active'` trong DB
- Check `deleted_at IS NULL`
