import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== DASHBOARD ====================
  @Get('dashboard/stats')
  @ApiOperation({
    summary: '[Admin] Dashboard - Thống kê tổng quan',
    description:
      'Lấy các số liệu thống kê quan trọng: tổng đơn hàng, khách hàng, sản phẩm, doanh thu và danh sách 10 đơn hàng gần nhất',
  })
  @ApiResponse({ status: 200, description: 'Trả về thống kê dashboard' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ==================== PRODUCTS MANAGEMENT ====================
  @Get('products')
  @ApiOperation({
    summary: '[Admin] Quản lý sản phẩm - Danh sách',
    description:
      'Lấy danh sách TẤT CẢ sản phẩm với phân trang, tìm kiếm và filter theo danh mục, trạng thái',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Số lượng sản phẩm mỗi trang',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'iPhone',
    description: 'Tìm kiếm theo tên hoặc SKU',
  })
  @ApiQuery({
    name: 'category_id',
    required: false,
    example: 'cat_01',
    description: 'Lọc theo danh mục',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'Active',
    description: 'Lọc theo trạng thái',
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm với metadata phân trang' })
  getProducts(@Query() query: any) {
    return this.adminService.getProducts(query);
  }

  @Post('products')
  @ApiOperation({
    summary: '[Admin] Quản lý sản phẩm - Tạo mới',
    description:
      'Tạo sản phẩm mới. Hệ thống tự động generate ID, slug từ tên sản phẩm. SKU phải unique.',
  })
  @ApiResponse({ status: 201, description: 'Sản phẩm được tạo thành công' })
  @ApiResponse({ status: 400, description: 'SKU đã tồn tại hoặc dữ liệu không hợp lệ' })
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.adminService.createProduct(createProductDto);
  }

  @Put('products/:id')
  @ApiOperation({
    summary: '[Admin] Quản lý sản phẩm - Cập nhật',
    description:
      'Cập nhật thông tin sản phẩm. Có thể cập nhật một hoặc nhiều trường (tên, giá, mô tả, danh mục, trạng thái...)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.adminService.updateProduct(id, updateProductDto);
  }

  // ==================== PRODUCT VARIANTS ====================
  @Post('products/:productId/variants')
  @ApiOperation({
    summary: '[Admin] Quản lý biến thể - Tạo mới',
    description: 'Thêm biến thể mới cho sản phẩm (size, màu sắc, tồn kho). SKU biến thể phải unique.',
  })
  @ApiResponse({ status: 201, description: 'Tạo biến thể thành công' })
  @ApiResponse({ status: 400, description: 'SKU biến thể đã tồn tại' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  createVariant(@Param('productId') productId: string, @Body() createVariantDto: CreateVariantDto) {
    return this.adminService.createVariant(productId, createVariantDto);
  }

  @Put('products/:productId/variants/:variantId')
  @ApiOperation({
    summary: '[Admin] Quản lý biến thể - Cập nhật',
    description: 'Cập nhật thông tin biến thể (size, màu, tồn kho).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật biến thể thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy biến thể' })
  updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.adminService.updateVariant(productId, variantId, updateVariantDto);
  }

  @Delete('products/:productId/variants/:variantId')
  @ApiOperation({
    summary: '[Admin] Quản lý biến thể - Xóa',
    description: 'Xóa một biến thể khỏi sản phẩm.',
  })
  @ApiResponse({ status: 200, description: 'Xóa biến thể thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy biến thể' })
  deleteVariant(@Param('productId') productId: string, @Param('variantId') variantId: string) {
    return this.adminService.deleteVariant(productId, variantId);
  }

  // ==================== PRODUCT IMAGES ====================
  @Post('products/:productId/images')
  @ApiOperation({
    summary: '[Admin] Quản lý ảnh - Thêm ảnh',
    description: 'Thêm ảnh mới cho sản phẩm. Có thể đặt ảnh chính và thứ tự hiển thị.',
  })
  @ApiResponse({ status: 201, description: 'Thêm ảnh thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  createImage(@Param('productId') productId: string, @Body() createImageDto: CreateImageDto) {
    return this.adminService.createImage(productId, createImageDto);
  }

  @Put('products/:productId/images/:imageId')
  @ApiOperation({
    summary: '[Admin] Quản lý ảnh - Cập nhật',
    description: 'Cập nhật thông tin ảnh (URL, ảnh chính, thứ tự).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật ảnh thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ảnh' })
  updateImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() updateImageDto: UpdateImageDto,
  ) {
    return this.adminService.updateImage(productId, imageId, updateImageDto);
  }

  @Delete('products/:productId/images/:imageId')
  @ApiOperation({
    summary: '[Admin] Quản lý ảnh - Xóa',
    description: 'Xóa một ảnh khỏi sản phẩm.',
  })
  @ApiResponse({ status: 200, description: 'Xóa ảnh thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ảnh' })
  deleteImage(@Param('productId') productId: string, @Param('imageId') imageId: string) {
    return this.adminService.deleteImage(productId, imageId);
  }

  // ==================== CATEGORIES MANAGEMENT ====================
  @Get('categories')
  @ApiOperation({
    summary: '[Admin] Quản lý danh mục - Danh sách',
    description:
      'Lấy danh sách TẤT CẢ danh mục với số lượng sản phẩm và trạng thái của mỗi danh mục',
  })
  @ApiResponse({ status: 200, description: 'Danh sách danh mục' })
  getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  @ApiOperation({
    summary: '[Admin] Quản lý danh mục - Tạo mới',
    description: 'Tạo danh mục mới. Hệ thống tự động generate ID và slug từ tên danh mục',
  })
  @ApiResponse({ status: 201, description: 'Danh mục được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Slug đã tồn tại' })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.adminService.createCategory(createCategoryDto);
  }

  @Put('categories/:id')
  @ApiOperation({
    summary: '[Admin] Quản lý danh mục - Cập nhật',
    description:
      'Cập nhật thông tin danh mục (tên, mô tả, trạng thái). Slug sẽ tự động update nếu đổi tên',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, updateCategoryDto);
  }

  // ==================== PROMOTIONS MANAGEMENT ====================
  @Get('promotions')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Danh sách',
    description:
      'Lấy danh sách TẤT CẢ mã giảm giá với phân trang, filter theo trạng thái, tìm kiếm theo code',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số mã giảm giá mỗi trang' })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'Active',
    description: 'Lọc theo trạng thái',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'SUMMER',
    description: 'Tìm kiếm theo mã code',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    example: 'true',
    description: 'Chỉ lấy mã đang hoạt động (active, chưa hết hạn, còn lượt dùng)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách mã giảm giá với metadata phân trang' })
  getPromotions(@Query() query: any) {
    return this.adminService.getPromotions(query);
  }

  @Get('promotions/:id')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Chi tiết',
    description: 'Lấy thông tin chi tiết một mã giảm giá',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết mã giảm giá' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã giảm giá' })
  getPromotionById(@Param('id') id: string) {
    return this.adminService.getPromotionById(id);
  }

  @Post('promotions')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Tạo mới',
    description:
      'Tạo mã giảm giá mới. Code phải UNIQUE, IN HOA, không dấu. Validate discount_value theo type (percentage: 1-100, fixed: >0). Validate dates.',
  })
  @ApiResponse({ status: 201, description: 'Mã giảm giá được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Code đã tồn tại hoặc dữ liệu không hợp lệ' })
  createPromotion(@Body() createPromotionDto: any) {
    return this.adminService.createPromotion(createPromotionDto);
  }

  @Put('promotions/:id')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Cập nhật',
    description: 'Cập nhật thông tin mã giảm giá. Không được thay đổi code.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã giảm giá' })
  updatePromotion(@Param('id') id: string, @Body() updatePromotionDto: any) {
    return this.adminService.updatePromotion(id, updatePromotionDto);
  }

  @Delete('promotions/:id')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Xóa',
    description: 'Xóa mã giảm giá khỏi hệ thống',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã giảm giá' })
  deletePromotion(@Param('id') id: string) {
    return this.adminService.deletePromotion(id);
  }

  @Post('promotions/:id/toggle')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Bật/Tắt',
    description: 'Chuyển đổi trạng thái Active/Inactive của mã giảm giá',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã giảm giá' })
  togglePromotionStatus(@Param('id') id: string) {
    return this.adminService.togglePromotionStatus(id);
  }

  @Get('promotions/:code/usage')
  @ApiOperation({
    summary: '[Admin] Quản lý mã giảm giá - Thống kê sử dụng',
    description:
      'Lấy thống kê chi tiết về việc sử dụng mã giảm giá: số lần đã dùng, còn lại, trạng thái hoạt động, hết hạn, hết lượt',
  })
  @ApiResponse({ status: 200, description: 'Thống kê sử dụng mã giảm giá' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã giảm giá' })
  getPromotionUsageStats(@Param('code') code: string) {
    return this.adminService.getPromotionUsageStats(code);
  }

  // ==================== ORDERS MANAGEMENT ====================
  @Get('orders')
  @ApiOperation({
    summary: '[Admin] Quản lý đơn hàng - Danh sách',
    description:
      'Lấy danh sách TẤT CẢ đơn hàng từ mọi khách hàng với phân trang, filter theo trạng thái, khách hàng, khoảng thời gian',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số đơn hàng mỗi trang' })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'Pending',
    description: 'Lọc theo trạng thái',
  })
  @ApiQuery({
    name: 'customer_email',
    required: false,
    example: 'user@example.com',
    description: 'Lọc theo email khách hàng',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng với metadata phân trang' })
  getOrders(@Query() query: any) {
    return this.adminService.getOrders(query);
  }

  @Put('orders/:id/status')
  @ApiOperation({
    summary: '[Admin] Quản lý đơn hàng - Cập nhật trạng thái',
    description:
      'Cập nhật trạng thái đơn hàng (Pending → Confirmed → Processing → Shipped → Delivered / hoặc Cancelled)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  updateOrderStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, updateStatusDto.status);
  }

  // ==================== CUSTOMERS MANAGEMENT ====================
  @Get('customers')
  @ApiOperation({
    summary: '[Admin] Quản lý khách hàng - Danh sách',
    description:
      'Lấy danh sách TẤT CẢ khách hàng với phân trang, thống kê số đơn hàng và tổng chi tiêu của mỗi khách',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số khách hàng mỗi trang' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'John',
    description: 'Tìm kiếm theo tên hoặc email',
  })
  @ApiResponse({ status: 200, description: 'Danh sách khách hàng với metadata phân trang' })
  getCustomers(@Query() query: any) {
    return this.adminService.getCustomers(query);
  }

  @Get('customers/:id')
  @ApiOperation({
    summary: '[Admin] Quản lý khách hàng - Chi tiết',
    description:
      'Xem chi tiết một khách hàng: thông tin cá nhân, danh sách đơn hàng, tổng chi tiêu, địa chỉ đã lưu',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết khách hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  getCustomerById(@Param('id') id: string) {
    return this.adminService.getCustomerById(id);
  }

  // ==================== SUPPORT & CONTENT MANAGEMENT ====================
  @Put('support/tickets/:id')
  @ApiOperation({
    summary: '[Admin] Hỗ trợ - Trả lời và cập nhật ticket',
    description:
      'Admin trả lời ticket khách hàng, cập nhật trạng thái (pending → in_progress → resolved → closed) và độ ưu tiên',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật ticket thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
  updateTicket(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.adminService.updateTicket(id, updateTicketDto);
  }

  @Put('pages/:slug')
  @ApiOperation({
    summary: '[Admin] Nội dung - Cập nhật trang tĩnh',
    description:
      'Cập nhật nội dung các trang tĩnh (About, FAQ, Terms, Privacy Policy...). Hỗ trợ HTML content',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trang thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  updatePage(@Param('slug') slug: string, @Body() updatePageDto: UpdatePageDto) {
    return this.adminService.updatePage(slug, updatePageDto);
  }

  // ==================== CHATBOT ANALYTICS ====================
  @Get('chatbot/conversations')
  @ApiOperation({
    summary: '[Admin] Chatbot - Danh sách conversations',
    description:
      'Xem tất cả conversations của chatbot với filter theo resolved status, phân trang và search',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số conversations mỗi trang' })
  @ApiQuery({ 
    name: 'resolved', 
    required: false, 
    example: 'false', 
    description: 'Filter theo resolved (true/false)' 
  })
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    example: 'order tracking', 
    description: 'Tìm trong last_message' 
  })
  @ApiResponse({ status: 200, description: 'Danh sách conversations' })
  getChatbotConversations(@Query() query: any) {
    return this.adminService.getChatbotConversations(query);
  }

  @Get('chatbot/conversations/:id')
  @ApiOperation({
    summary: '[Admin] Chatbot - Chi tiết conversation',
    description: 'Xem chi tiết một conversation với tất cả messages',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết conversation và messages' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy conversation' })
  getChatbotConversationDetail(@Param('id') id: string) {
    return this.adminService.getChatbotConversationDetail(id);
  }

  @Get('chatbot/analytics')
  @ApiOperation({
    summary: '[Admin] Chatbot - Analytics',
    description:
      'Thống kê chatbot: tổng conversations, messages, resolved rate, fallback rate, top intents, daily activity',
  })
  @ApiResponse({ status: 200, description: 'Analytics data' })
  getChatbotAnalytics() {
    return this.adminService.getChatbotAnalytics();
  }

  @Get('chatbot/unanswered')
  @ApiOperation({
    summary: '[Admin] Chatbot - Câu hỏi chưa trả lời',
    description:
      'Danh sách conversations unresolved với message count cao (user đang gặp khó khăn)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách conversations cần admin hỗ trợ' })
  getChatbotUnanswered() {
    return this.adminService.getChatbotUnanswered();
  }

  // ==================== AI RECOMMENDATIONS ADMIN ====================
  @Get('ai/recommendations')
  @ApiOperation({
    summary: '[Admin] AI - Danh sách recommendations',
    description: 'Xem tất cả AI recommendations với filter theo user_id, product_id, phân trang',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 50, description: 'Số recommendations mỗi trang' })
  @ApiQuery({ name: 'user_id', required: false, description: 'Filter theo user' })
  @ApiQuery({ name: 'product_id', required: false, description: 'Filter theo product' })
  @ApiResponse({ status: 200, description: 'Danh sách AI recommendations' })
  getAiRecommendations(@Query() query: any) {
    return this.adminService.getAiRecommendations(query);
  }

  @Get('ai/recommendations/stats')
  @ApiOperation({
    summary: '[Admin] AI - Thống kê recommendations',
    description:
      'Thống kê AI recommendations: tổng số, top products, top users, reason counts',
  })
  @ApiResponse({ status: 200, description: 'Thống kê AI recommendations' })
  getAiRecommendationStats() {
    return this.adminService.getAiRecommendationStats();
  }

  // ==================== INVENTORY MANAGEMENT ====================
  @Get('inventory')
  @ApiOperation({
    summary: '[Admin] Quản lý tồn kho',
    description:
      'Xem tình trạng tồn kho của tất cả sản phẩm với các biến thể (variants), cảnh báo sản phẩm sắp hết hàng',
  })
  @ApiQuery({
    name: 'low_stock',
    required: false,
    example: 'true',
    description: 'Chỉ hiển thị sản phẩm sắp hết hàng (< 10)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách tồn kho' })
  getInventory(@Query('low_stock') lowStock?: string) {
    return this.adminService.getInventory(lowStock === 'true');
  }
}
