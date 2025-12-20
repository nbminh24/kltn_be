# YÊU CẦU FRONTEND - TÍNH NĂNG TÌM KIẾM SẢN PHẨM QUA HÌNH ẢNH

## 1. TỔNG QUAN

### Mục tiêu
Xây dựng tính năng cho phép user upload ảnh trong chat để tìm sản phẩm thời trang tương tự. Tương tự như tìm kiếm bằng keyword nhưng input là hình ảnh thay vì text.

### Use Case
- User chụp/upload ảnh sản phẩm thời trang họ thích
- System tìm và hiển thị 4-10 sản phẩm tương tự từ catalog
- Mỗi sản phẩm hiển thị % độ tương đồng
- User click vào sản phẩm để xem chi tiết

---

## 2. API ENDPOINT

### Backend Endpoint

**Endpoint:** `POST /api/v1/chat/search-by-image`

**Base URL:** `http://localhost:3001` (development)

**Request:**
```typescript
Content-Type: multipart/form-data

FormData:
  - image: File (jpg, png, webp)
```

**Response Success (200):**
```typescript
{
  success: boolean;
  total: number;
  products: Array<{
    id: number;                    // Product ID
    name: string;                  // Tên sản phẩm
    selling_price: number;         // Giá bán
    thumbnail_url: string;         // URL ảnh thumbnail
    slug: string;                  // Slug cho link /products/:slug
    similarity_score: number;      // 0.0 - 1.0 (0% - 100%)
    matched_image_url: string;     // URL ảnh matched từ Image Search
  }>;
}
```

**Response Example:**
```json
{
  "success": true,
  "total": 4,
  "products": [
    {
      "id": 493,
      "name": "Áo Thun Ringer Relaxed Fit Animal Mood",
      "selling_price": 299000,
      "thumbnail_url": "https://res.cloudinary.com/doticibcy/image/...",
      "slug": "ao-thun-ringer-relaxed-fit-animal-mood",
      "similarity_score": 1.0,
      "matched_image_url": "https://res.cloudinary.com/doticibcy/image/..."
    },
    {
      "id": 464,
      "name": "Áo Thun Ringer Relaxed Fit Animal Puppy Girl",
      "selling_price": 349000,
      "thumbnail_url": "https://...",
      "slug": "ao-thun-ringer-relaxed-fit-animal-puppy-girl",
      "similarity_score": 0.2819,
      "matched_image_url": "https://..."
    }
  ]
}
```

**Error Responses:**

```typescript
// 400 - No image provided
{
  "statusCode": 400,
  "message": "No image file provided"
}

// 503 - Image Search Service unavailable
{
  "statusCode": 503,
  "message": "Image Search Service is not available"
}
```

---

## 3. UI/UX FLOW

### Flow tương tự như Keyword Search

**Keyword Search Flow (hiện tại):**
```
1. User nhập text → Enter
2. Call API search by keyword
3. Hiển thị danh sách sản phẩm
4. User click → navigate to /products/:slug
```

**Image Search Flow (mới):**
```
1. User click icon camera/upload trong chat input
2. Chọn ảnh từ device hoặc chụp ảnh (mobile)
3. Preview ảnh đã chọn (optional)
4. Click "Tìm kiếm tương tự"
5. Show loading state
6. Call API POST /api/v1/chat/search-by-image
7. Hiển thị kết quả dạng grid/carousel
   - Mỗi card hiển thị:
     * Ảnh sản phẩm
     * Tên sản phẩm
     * Giá
     * % Tương đồng (badge)
8. User click card → navigate to /products/:slug
```

### UI Components cần thiết

#### 1. Image Upload Button
```tsx
// Thêm vào chat input area
<Button 
  icon={<CameraIcon />}
  onClick={handleImageUpload}
  tooltip="Tìm kiếm bằng hình ảnh"
/>

// hoặc
<input
  type="file"
  accept="image/*"
  capture="environment" // Cho phép chụp ảnh trực tiếp trên mobile
  onChange={handleImageChange}
/>
```

#### 2. Image Preview (optional)
```tsx
{selectedImage && (
  <ImagePreview>
    <img src={URL.createObjectURL(selectedImage)} />
    <Button onClick={handleSearchByImage}>
      Tìm sản phẩm tương tự
    </Button>
    <Button onClick={handleCancel}>
      Hủy
    </Button>
  </ImagePreview>
)}
```

#### 3. Results Display (quan trọng)
```tsx
// Giống Product Grid/Carousel
<SearchResults>
  <h3>🔍 Tìm thấy {total} sản phẩm tương tự</h3>
  
  <ProductGrid>
    {products.map(product => (
      <ProductCard key={product.id}>
        <Image src={product.thumbnail_url} />
        
        {/* Badge hiển thị % tương đồng */}
        <Badge color={getSimilarityColor(product.similarity_score)}>
          {Math.round(product.similarity_score * 100)}% tương đồng
        </Badge>
        
        <ProductName>{product.name}</ProductName>
        <Price>{formatPrice(product.selling_price)}</Price>
        
        <Link href={`/products/${product.slug}`}>
          Xem chi tiết
        </Link>
      </ProductCard>
    ))}
  </ProductGrid>
</SearchResults>
```

**Similarity Badge Color:**
```typescript
function getSimilarityColor(score: number) {
  if (score >= 0.8) return 'green';      // 80-100%: Rất giống
  if (score >= 0.5) return 'yellow';     // 50-79%: Khá giống
  if (score >= 0.3) return 'orange';     // 30-49%: Tương tự
  return 'gray';                         // <30%: Ít giống
}
```

---

## 4. IMPLEMENTATION CODE EXAMPLE

### TypeScript Types

```typescript
// types/image-search.ts
export interface ImageSearchProduct {
  id: number;
  name: string;
  selling_price: number;
  thumbnail_url: string;
  slug: string;
  similarity_score: number;
  matched_image_url: string;
}

export interface ImageSearchResponse {
  success: boolean;
  total: number;
  products: ImageSearchProduct[];
}
```

### API Service

```typescript
// services/imageSearchService.ts
export async function searchProductsByImage(
  imageFile: File
): Promise<ImageSearchResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/search-by-image`,
    {
      method: 'POST',
      body: formData,
      // Không set Content-Type, browser tự động set với boundary
    }
  );

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error('Dịch vụ tìm kiếm hình ảnh tạm thời không khả dụng');
    }
    throw new Error('Lỗi khi tìm kiếm sản phẩm');
  }

  return response.json();
}
```

### React Component Example (Next.js)

```tsx
// components/ImageSearchButton.tsx
'use client';

import { useState } from 'react';
import { searchProductsByImage } from '@/lib/services/imageSearchService';
import type { ImageSearchProduct } from '@/lib/types/image-search';

export default function ImageSearchButton() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ImageSearchProduct[]>([]);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file hình ảnh');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Ảnh không được vượt quá 10MB');
        return;
      }
      
      setSelectedImage(file);
      setError('');
      
      // Tự động search sau khi chọn ảnh
      handleSearch(file);
    }
  };

  const handleSearch = async (file: File) => {
    setIsSearching(true);
    setError('');

    try {
      const response = await searchProductsByImage(file);
      
      if (response.success && response.products.length > 0) {
        setResults(response.products);
      } else {
        setError('Không tìm thấy sản phẩm tương tự');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      {/* Upload Button */}
      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <button className="btn btn-secondary">
          📷 Tìm kiếm bằng hình ảnh
        </button>
      </label>

      {/* Loading State */}
      {isSearching && (
        <div className="loading">
          Đang tìm kiếm sản phẩm tương tự...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error">{error}</div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="results">
          <h3>🔍 Tìm thấy {results.length} sản phẩm tương tự</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map((product) => (
              <a
                key={product.id}
                href={`/products/${product.slug}`}
                className="product-card"
              >
                <img 
                  src={product.thumbnail_url} 
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
                
                {/* Similarity Badge */}
                <div className={`badge ${getSimilarityColor(product.similarity_score)}`}>
                  {Math.round(product.similarity_score * 100)}% tương đồng
                </div>
                
                <h4 className="product-name">{product.name}</h4>
                <p className="price">
                  {product.selling_price.toLocaleString('vi-VN')}đ
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getSimilarityColor(score: number): string {
  if (score >= 0.8) return 'text-green-600 bg-green-50';
  if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
  if (score >= 0.3) return 'text-orange-600 bg-orange-50';
  return 'text-gray-600 bg-gray-50';
}
```

---

## 5. INTEGRATION VÀO CHAT INTERFACE

### Thêm vào Chat Input Area

```tsx
// components/ChatInput.tsx
<div className="chat-input-container">
  {/* Existing text input */}
  <input
    type="text"
    placeholder="Nhập tin nhắn..."
    value={message}
    onChange={(e) => setMessage(e.target.value)}
  />
  
  {/* NEW: Image Search Button */}
  <ImageSearchButton onResultsFound={handleSearchResults} />
  
  {/* Send button */}
  <button onClick={handleSendMessage}>
    Gửi
  </button>
</div>
```

### Hiển thị kết quả trong Chat

**Option 1: Hiển thị trong chat messages**
```tsx
// Thêm vào chat history
{
  type: 'image_search_results',
  sender: 'bot',
  timestamp: new Date(),
  data: {
    total: 4,
    products: [...]
  }
}

// Render trong chat
{message.type === 'image_search_results' && (
  <SearchResultsCard products={message.data.products} />
)}
```

**Option 2: Modal/Overlay riêng**
```tsx
// Hiển thị fullscreen modal với kết quả
<Modal open={showResults}>
  <ProductSearchResults products={results} />
</Modal>
```

---

## 6. RESPONSIVE DESIGN

### Mobile
- Button camera lớn, dễ bấm
- Hỗ trợ chụp ảnh trực tiếp (`capture="environment"`)
- Grid 2 cột cho results
- Swipe carousel cho product cards

### Desktop
- Button nhỏ gọn trong chat input
- Upload từ file explorer
- Grid 4 cột cho results
- Hover effects

---

## 7. PERFORMANCE & OPTIMIZATION

### Image Upload Optimization

```typescript
// Compress image trước khi upload
async function compressImage(file: File): Promise<File> {
  // Sử dụng thư viện: browser-image-compression
  const options = {
    maxSizeMB: 1,          // Max 1MB
    maxWidthOrHeight: 1024, // Max dimension
    useWebWorker: true
  };
  
  return await imageCompression(file, options);
}

// Sử dụng:
const compressedFile = await compressImage(selectedImage);
await searchProductsByImage(compressedFile);
```

### Loading States
```tsx
{isSearching && (
  <div className="flex items-center gap-2">
    <Spinner />
    <span>Đang phân tích hình ảnh... {progress}%</span>
  </div>
)}
```

### Caching
```typescript
// Cache results trong session
const cacheKey = `img_search_${fileHash}`;
const cached = sessionStorage.getItem(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// Sau khi search xong
sessionStorage.setItem(cacheKey, JSON.stringify(results));
```

---

## 8. ERROR HANDLING

### Các trường hợp cần xử lý

```typescript
try {
  const results = await searchProductsByImage(file);
  
  if (results.total === 0) {
    // Không tìm thấy sản phẩm
    showMessage('Không tìm thấy sản phẩm tương tự. Thử với ảnh khác?');
  }
  
} catch (error) {
  if (error.message.includes('503')) {
    // Service unavailable
    showError('Dịch vụ tìm kiếm đang bảo trì. Vui lòng thử lại sau.');
  } else if (error.message.includes('400')) {
    // Bad request
    showError('File không hợp lệ. Vui lòng chọn ảnh khác.');
  } else {
    // Generic error
    showError('Có lỗi xảy ra. Vui lòng thử lại.');
  }
}
```

### User-friendly Messages
```tsx
const ERROR_MESSAGES = {
  NO_RESULTS: 'Không tìm thấy sản phẩm tương tự. Bạn có thể thử:\n- Chụp ảnh rõ hơn\n- Chọn góc chụp khác\n- Thử với sản phẩm khác',
  SERVICE_DOWN: 'Dịch vụ tìm kiếm hình ảnh đang tạm ngưng. Vui lòng thử lại sau ít phút.',
  NETWORK_ERROR: 'Lỗi kết nối. Kiểm tra internet và thử lại.',
  INVALID_FILE: 'File không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WEBP.',
  FILE_TOO_LARGE: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.'
};
```

---

## 9. TESTING

### Test Cases

1. **Upload ảnh hợp lệ**
   - Chọn ảnh sản phẩm → Verify results hiển thị
   - Check similarity scores đúng format

2. **Upload ảnh không có trong catalog**
   - Verify message "Không tìm thấy sản phẩm"

3. **Upload file không phải ảnh**
   - Verify error message hiển thị

4. **Network timeout**
   - Simulate slow network → Verify loading state

5. **Service unavailable**
   - Backend down → Verify error message

### Test Data
- Ảnh test: Sử dụng ảnh từ catalog hiện có
- Expected: Ít nhất 1 result với similarity > 80%

---

## 10. SO SÁNH VỚI KEYWORD SEARCH

| Feature | Keyword Search | Image Search |
|---------|---------------|--------------|
| Input | Text field | Image upload |
| API | `GET /api/products/search?q=...` | `POST /api/v1/chat/search-by-image` |
| Response | Products list | Products list + similarity |
| UI | Search bar | Camera button |
| Results Display | Grid/List | Grid + similarity badge |
| User Flow | Type → Enter → Results | Upload → Results |
| Loading Time | ~200ms | ~500-1000ms |

### Reuse Components
- `ProductCard` component (hiện tại dùng cho keyword search)
- `ProductGrid` layout
- Price formatting utilities
- Product link navigation

**Chỉ cần thêm:**
- Image upload button
- Similarity badge
- Loading state (lâu hơn keyword search)

---

## 11. TECHNICAL REQUIREMENTS

### Dependencies cần cài
```json
{
  "browser-image-compression": "^2.0.0"  // Optional: compress image
}
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- File API & FormData support

---

## 12. DELIVERABLES

### Phase 1: Basic Implementation (Priority)
- ✅ Image upload button trong chat
- ✅ Call API POST /api/v1/chat/search-by-image
- ✅ Hiển thị results dạng grid
- ✅ Show similarity percentage
- ✅ Click product → navigate to detail page

### Phase 2: UX Enhancement
- Image preview trước khi search
- Image compression
- Better loading states
- Empty state illustrations

### Phase 3: Advanced Features
- Save search history
- Compare products side-by-side
- Share search results

---

## 13. BACKEND INFORMATION

### Backend Status
✅ **Hoàn tất và sẵn sàng sử dụng**

### Backend Components
- Image Search Service (FastAPI): Running tại `http://localhost:8000`
- Backend API (NestJS): `http://localhost:3001`
- Database: 12,263 sản phẩm đã được indexed
- Response time: ~1 giây (bao gồm AI processing)

### Backend Team Contact
- Đã implement đầy đủ API endpoint
- Đã test thành công với 4 results
- Không cần thay đổi gì thêm từ backend

---

## 14. NOTES & TIPS

### Best Practices
- Compress ảnh trước khi upload để tăng tốc độ
- Show loading indicator rõ ràng (AI processing mất ~1s)
- Handle empty results gracefully
- Cache results để tránh search lại

### Common Pitfalls
- ❌ Không validate file type → User upload PDF/video
- ❌ Không giới hạn file size → Timeout
- ❌ Không show loading state → User nghĩ bị lag
- ❌ Không handle service down → App crash

### Performance Tips
- Lazy load product images trong results
- Debounce nếu cho phép real-time search
- Preload next page of results

---

## QUESTIONS?

Contact Backend Team nếu cần:
- API documentation chi tiết hơn
- Test data/images
- Debug issues
- Performance tuning
