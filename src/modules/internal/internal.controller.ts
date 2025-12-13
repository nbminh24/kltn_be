import { Controller, Get, Query, Param, UseGuards, Post, Body, UseFilters, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { InternalService } from './internal.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ProductSearchDto } from './dto/product-search.dto';
import { InternalApiExceptionFilter } from './filters/internal-api-exception.filter';

@ApiTags('Internal APIs')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseFilters(InternalApiExceptionFilter)
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) { }

  @Get('orders/:id')
  @ApiOperation({
    summary: '[Internal] Tra cứu đơn hàng',
    description: 'API cho Rasa Action Server tra cứu thông tin đơn hàng. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin đơn hàng' })
  getOrderById(@Param('id') orderId: string) {
    return this.internalService.getOrderById(orderId);
  }

  @Get('products')
  @ApiOperation({
    summary: '[UC 1.8] Tìm kiếm sản phẩm cho Chatbot',
    description: `API cung cấp thông tin sản phẩm cho chatbot.
    Query params:
    - search: Tìm theo tên/mô tả (vd: ?search=áo khoác)
    - category: Lọc theo category slug (vd: ?category=ao-khoac)
    - limit: Số lượng kết quả (default: 10)
    
    Trả về: name, selling_price, total_stock, description, category_name, thumbnail_url`,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách sản phẩm với thông tin đầy đủ',
    schema: {
      example: {
        products: [
          {
            id: 1,
            name: 'Áo Khoác Denim Oversize',
            slug: 'ao-khoac-denim-oversize',
            description: 'Áo khoác denim phong cách oversize...',
            selling_price: 450000,
            total_stock: 25,
            category_name: 'Áo Khoác',
            thumbnail_url: 'https://...jpg',
            available_sizes: ['S', 'M', 'L', 'XL'],
            available_colors: ['Xanh Denim', 'Đen'],
            images: [
              'https://image1.jpg',
              'https://image2.jpg',
              'https://image3.jpg'
            ]
          }
        ],
        count: 1
      }
    }
  })
  searchProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: number,
  ) {
    return this.internalService.searchProducts({ search, category, limit: limit || 10 });
  }

  @Post('products/search')
  @ApiOperation({
    summary: '[Chatbot] Product Search (Scoring + Explainability)',
    description: `Endpoint search dành riêng cho chatbot.
    Nhận JSON body để chatbot có thể gửi dần params theo hội thoại.
    Trả về score (0..1) + matched_on để chatbot giải thích lý do chọn sản phẩm.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách sản phẩm đã được re-rank theo score',
  })
  searchProductsForChatbot(@Body() dto: ProductSearchDto) {
    return this.internalService.searchProductsForChatbot(dto);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: '[Chatbot] Get Product Details with Variants',
    description: `Get product details including variants with color_id, size_id for accurate variant matching in chatbot add-to-cart flow.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Product details with variants',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  getProductById(@Param('id') id: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }
    return this.internalService.getProductById(productId);
  }

  @Get('pages/:slug')
  @ApiOperation({
    summary: '[UC 2.5] Lấy nội dung trang cho Chatbot',
    description: `API cung cấp nội dung các trang tĩnh (FAQ, chính sách) cho chatbot.
    Example: /internal/pages/chinh-sach-doi-tra
    
    Trả về: title, body_content (HTML/text), meta_description`,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về nội dung trang',
    schema: {
      example: {
        slug: 'chinh-sach-doi-tra',
        title: 'Chính Sách Đổi Trả',
        body_content: '<p>Nội dung chính sách đổi trả...</p>'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.internalService.getPageBySlug(slug);
  }

  @Get('faq')
  @ApiOperation({
    summary: '[Internal] Tra cứu FAQ/Content',
    description: 'API cho Rasa Action Server tra cứu nội dung FAQ, policies. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về nội dung tìm được' })
  searchFaq(@Query('query') query: string) {
    return this.internalService.searchFaq(query);
  }

  @Get('users/email/:email')
  @ApiOperation({
    summary: '[Internal] Tra cứu user theo email',
    description: 'API cho Rasa Action Server tra cứu thông tin user. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin user' })
  getUserByEmail(@Param('email') email: string) {
    return this.internalService.getUserByEmail(email);
  }

  @Get('customers/orders')
  @ApiOperation({
    summary: '[UC 1.15] Tra cứu đơn hàng của khách hàng cho Chatbot',
    description: `API cung cấp thông tin đơn hàng của customer cho chatbot.
    Query params:
    - email: Email khách hàng (REQUIRED) (vd: ?email=customer@gmail.com)
    
    Chatbot sẽ hỏi customer email → Gọi API này → Trả về danh sách đơn hàng.
    Trả về: customer info, orders list với status, payment_status, items`,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin customer và danh sách đơn hàng',
    schema: {
      example: {
        customer: {
          name: 'Nguyễn Văn A',
          email: 'customer@gmail.com'
        },
        orders: [
          {
            id: 1,
            order_id: 1,
            status: 'delivered',
            payment_status: 'paid',
            total_amount: 500000,
            created_at: '2024-11-10T10:00:00Z',
            items_count: 2,
            items: [
              {
                product_name: 'Áo Khoác Denim',
                quantity: 1,
                price_at_purchase: 450000
              }
            ]
          }
        ],
        total_orders: 1
      }
    }
  })
  getCustomerOrders(@Query('email') email: string) {
    return this.internalService.getCustomerOrders({ email });
  }

  @Get('variants')
  @ApiOperation({
    summary: '[Chatbot] Tìm kiếm Product Variants',
    description: `API tìm kiếm variants với nhiều filter options.
    Query params:
    - product_id: Lọc theo product ID
    - sku: Tìm theo SKU (partial match)
    - size: Lọc theo size (vd: ?size=L)
    - color: Lọc theo màu (vd: ?color=Đen)
    - in_stock: true/false - Chỉ lấy variants còn hàng
    - limit: Số lượng kết quả (default: 20)
    
    Trả về: variant_id, product_name, sku, size, color, stock, price, images`,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách variants',
    schema: {
      example: {
        variants: [
          {
            variant_id: 1,
            product_id: 1,
            product_name: 'Áo Khoác Denim Oversize',
            product_slug: 'ao-khoac-denim-oversize',
            variant_name: 'Áo Khoác Denim - L - Xanh',
            sku: 'AKD-L-XANH',
            size: 'L',
            color: 'Xanh Denim',
            color_hex: '#4682B4',
            total_stock: 25,
            reserved_stock: 3,
            available_stock: 22,
            status: 'active',
            price: 450000,
            category: 'Áo Khoác',
            images: ['https://image1.jpg', 'https://image2.jpg'],
            main_image: 'https://image1.jpg'
          }
        ],
        count: 1
      }
    }
  })
  searchVariants(
    @Query('product_id') product_id?: number,
    @Query('sku') sku?: string,
    @Query('size') size?: string,
    @Query('color') color?: string,
    @Query('in_stock') in_stock?: boolean,
    @Query('limit') limit?: number,
  ) {
    return this.internalService.searchVariants({
      product_id: product_id ? Number(product_id) : undefined,
      sku,
      size,
      color,
      in_stock: in_stock === true || in_stock === 'true' as any,
      limit: limit ? Number(limit) : 20,
    });
  }

  // ==================== CHATBOT INTERNAL APIs ====================

  @Post('products/sizing-advice')
  @ApiOperation({
    summary: '[Chatbot] Tư vấn size sản phẩm',
    description: 'API cho chatbot tư vấn size dựa trên chiều cao, cân nặng và category sản phẩm',
  })
  @ApiResponse({ status: 200, description: 'Trả về size gợi ý' })
  getSizingAdvice(@Body() dto: any) {
    return this.internalService.getSizingAdvice(dto);
  }

  @Get('products/:id/styling-rules')
  @ApiOperation({
    summary: '[Chatbot] Tư vấn phối đồ',
    description: 'API trả về gợi ý phối đồ dựa trên category sản phẩm',
  })
  @ApiResponse({ status: 200, description: 'Danh sách gợi ý phối đồ' })
  getStylingRules(@Param('id') productId: number) {
    return this.internalService.getStylingRules(productId);
  }

  @Get('promotions/top-discounts')
  @ApiOperation({
    summary: '[Chatbot] Top sản phẩm giảm giá',
    description: 'API trả về danh sách sản phẩm có discount cao nhất',
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm giảm giá' })
  getTopDiscounts(@Query('limit') limit?: number) {
    return this.internalService.getTopDiscounts(limit || 20);
  }

  @Post('notifications/subscribe')
  @ApiOperation({
    summary: '[Chatbot] Đăng ký thông báo',
    description: 'Đăng ký nhận thông báo khi có hàng hoặc giá giảm',
  })
  @ApiResponse({ status: 200, description: 'Đăng ký thành công' })
  subscribeNotification(@Body() dto: any) {
    return this.internalService.subscribeNotification(dto);
  }

  @Post('support/create-ticket')
  @ApiOperation({
    summary: '[Chatbot] Tạo phiếu hỗ trợ',
    description: 'Tạo ticket hỗ trợ từ chatbot với thông tin phân loại',
  })
  @ApiResponse({ status: 201, description: 'Ticket đã được tạo' })
  createTicketInternal(@Body() dto: any) {
    return this.internalService.createTicketInternal(dto);
  }
}
