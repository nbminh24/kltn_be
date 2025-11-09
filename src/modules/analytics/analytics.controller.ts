import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin - Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  @ApiOperation({
    summary: '[UC-A01] Dashboard - Thống kê KPIs tổng quan',
    description: 'Lấy các chỉ số KPI: Total Revenue, New Orders, Avg Order Value, AI Escalated',
  })
  @ApiQuery({ name: 'period', required: false, example: '7d', description: '7d, 30d, 90d' })
  @ApiResponse({ status: 200, description: 'KPIs dashboard' })
  getDashboardStats(@Query('period') period: string = '7d') {
    return this.analyticsService.getDashboardStats(period);
  }

  @Get('sales-overview')
  @ApiOperation({
    summary: '[UC-A01] Dashboard - Biểu đồ doanh thu',
    description: 'Dữ liệu cho biểu đồ Line Chart - Sales Overview theo ngày',
  })
  @ApiQuery({ name: 'period', required: false, example: '30d', description: '7d, 30d, 90d' })
  @ApiResponse({ status: 200, description: 'Sales overview data' })
  getSalesOverview(@Query('period') period: string = '30d') {
    return this.analyticsService.getSalesOverview(period);
  }
}

@ApiTags('Admin - Product Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/products')
export class ProductAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':id/analytics')
  @ApiOperation({
    summary: '[UC-A02] Thống kê chi tiết sản phẩm',
    description: 'KPIs cho 1 sản phẩm: Units Sold, Total Orders, Avg Rating, Total Reviews',
  })
  @ApiResponse({ status: 200, description: 'Product analytics' })
  getProductAnalytics(@Param('id') id: string) {
    return this.analyticsService.getProductAnalytics(parseInt(id));
  }

  @Get(':id/variant-sales')
  @ApiOperation({
    summary: '[UC-A02] Doanh thu theo biến thể',
    description: 'Dữ liệu cho Pie Chart - Variants by Sales',
  })
  @ApiResponse({ status: 200, description: 'Variant sales distribution' })
  getVariantSales(@Param('id') id: string) {
    return this.analyticsService.getVariantSales(parseInt(id));
  }

  @Get(':id/rating-distribution')
  @ApiOperation({
    summary: '[UC-A02] Phân bố đánh giá',
    description: 'Dữ liệu cho Bar Chart - Rating Distribution (5 sao, 4 sao, ...)',
  })
  @ApiResponse({ status: 200, description: 'Rating distribution' })
  getRatingDistribution(@Param('id') id: string) {
    return this.analyticsService.getRatingDistribution(parseInt(id));
  }
}

@ApiTags('Admin - Operations Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class OperationsAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('orders/status-counts')
  @ApiOperation({
    summary: '[UC-A03] Thống kê đơn hàng',
    description: 'Đếm số lượng đơn hàng theo trạng thái (pending, processing, delivered, cancelled)',
  })
  @ApiResponse({ status: 200, description: 'Order status counts' })
  getOrderStatusCounts() {
    return this.analyticsService.getOrderStatusCounts();
  }

  @Get('inventory/stats')
  @ApiOperation({
    summary: '[UC-A04] Thống kê kho',
    description: 'Tổng sản phẩm, sắp hết hàng, hết hàng, tổng giá trị tồn kho',
  })
  @ApiResponse({ status: 200, description: 'Inventory statistics' })
  getInventoryStats() {
    return this.analyticsService.getInventoryStats();
  }

  @Get('support-tickets/status-counts')
  @ApiOperation({
    summary: '[UC-A05] Thống kê phiếu hỗ trợ',
    description: 'Đếm số lượng tickets theo trạng thái (pending, replied, resolved)',
  })
  @ApiResponse({ status: 200, description: 'Support ticket status counts' })
  getSupportTicketStatusCounts() {
    return this.analyticsService.getSupportTicketStatusCounts();
  }
}
