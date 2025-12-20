# Image Search Feature - Quick Start Guide cho Frontend

## TL;DR

Xây dựng tính năng tìm kiếm sản phẩm bằng hình ảnh trong chat, tương tự như search by keyword nhưng input là ảnh.

---

## API Endpoint

**POST** `http://localhost:3001/api/v1/chat/search-by-image`

**Request:**
```typescript
const formData = new FormData();
formData.append('image', imageFile);

fetch('http://localhost:3001/api/v1/chat/search-by-image', {
  method: 'POST',
  body: formData
})
```

**Response:**
```json
{
  "success": true,
  "total": 4,
  "products": [
    {
      "id": 493,
      "name": "Áo Thun Ringer Relaxed Fit Animal Mood",
      "selling_price": 299000,
      "thumbnail_url": "https://...",
      "slug": "ao-thun-ringer-relaxed-fit-animal-mood",
      "similarity_score": 1.0,  // 0.0 - 1.0
      "matched_image_url": "https://..."
    }
  ]
}
```

---

## UI Flow

1. Thêm button 📷 vào chat input area
2. User click → chọn/chụp ảnh
3. Call API với FormData
4. Show loading (~1 giây)
5. Hiển thị results:
   - Grid layout (giống keyword search)
   - Mỗi card có **badge % tương đồng**
   - Click → navigate to `/products/:slug`

---

## Code Example

```tsx
// Component
const [results, setResults] = useState([]);
const [loading, setLoading] = useState(false);

const handleImageUpload = async (file: File) => {
  setLoading(true);
  
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch(
    'http://localhost:3001/api/v1/chat/search-by-image',
    { method: 'POST', body: formData }
  );
  
  const data = await response.json();
  setResults(data.products);
  setLoading(false);
};

// Render results
{results.map(product => (
  <ProductCard key={product.id}>
    <img src={product.thumbnail_url} />
    
    {/* Similarity badge - QUAN TRỌNG */}
    <Badge>
      {Math.round(product.similarity_score * 100)}% tương đồng
    </Badge>
    
    <h4>{product.name}</h4>
    <p>{product.selling_price.toLocaleString()}đ</p>
    <Link href={`/products/${product.slug}`}>Xem</Link>
  </ProductCard>
))}
```

---

## Similarity Badge Colors

```typescript
function getBadgeColor(score: number) {
  if (score >= 0.8) return 'green';    // 80-100%: Rất giống
  if (score >= 0.5) return 'yellow';   // 50-79%: Khá giống  
  if (score >= 0.3) return 'orange';   // 30-49%: Tương tự
  return 'gray';                       // <30%: Ít giống
}
```

---

## Components Reuse

**Có thể dùng lại:**
- ProductCard component (từ keyword search)
- ProductGrid layout
- Price formatting
- Navigation logic

**Chỉ cần thêm:**
- Image upload button (📷)
- Similarity badge UI
- Loading state (lâu hơn keyword search ~1s)

---

## Backend Info

✅ **API đã sẵn sàng**
- Endpoint: `POST /api/v1/chat/search-by-image`
- Response time: ~1 giây
- 12,263 sản phẩm đã indexed
- Đã test thành công

**Không cần:**
- Authentication (endpoint public)
- Thay đổi gì từ backend

---

## Checklist Implementation

### Phase 1 (Priority)
- [ ] Upload button trong chat input
- [ ] Call API với FormData
- [ ] Hiển thị results grid
- [ ] Thêm similarity badge (%)
- [ ] Link to product detail

### Phase 2 (Enhancement)
- [ ] Image preview trước search
- [ ] Compress ảnh (max 1MB)
- [ ] Better loading states
- [ ] Error handling

### Phase 3 (Optional)
- [ ] Search history
- [ ] Mobile camera capture
- [ ] Result caching

---

## Testing

**Test với ảnh này:**
```
https://res.cloudinary.com/doticibcy/image/upload/v1765594794/theneworiginals/ao-thun-ringer/%C3%81o_Thun_Ringer_Relaxed_Fit_Animal_Mood_Cold_Hand_Warrm_Heart/Tr_ngc_d_tr_c_664eca4e-b22a-4540-ac8a-220e2ba551a9_cxkzhm.png
```

**Expected:**
- Product ID: 493
- Similarity: 100%
- Total results: 4 sản phẩm

---

## Error Handling

```typescript
try {
  const data = await searchByImage(file);
  if (data.total === 0) {
    showMessage('Không tìm thấy sản phẩm tương tự');
  }
} catch (error) {
  if (error.status === 503) {
    showError('Dịch vụ đang bảo trì');
  } else {
    showError('Có lỗi xảy ra, thử lại');
  }
}
```

---

## File Validation

```typescript
// Validate trước khi upload
if (!file.type.startsWith('image/')) {
  return 'Chỉ chấp nhận file hình ảnh';
}

if (file.size > 10 * 1024 * 1024) {
  return 'Ảnh không vượt quá 10MB';
}
```

---

## Questions?

Liên hệ Backend Team nếu cần:
- API docs chi tiết: `FRONTEND_IMAGE_SEARCH_REQUIREMENTS.md`
- Test images
- Debug support
