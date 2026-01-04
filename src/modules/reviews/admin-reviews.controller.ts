import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin - Reviews')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: '[UC-A08] Admin - Danh sách tất cả đánh giá',
    description: 'Lấy danh sách reviews với filter theo product_id, rating, status và phân trang',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'product_id', required: false, description: 'Lọc theo sản phẩm' })
  @ApiQuery({ name: 'rating', required: false, example: 5, description: 'Lọc theo rating (1-5)' })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'pending',
    description: 'pending/approved/rejected',
  })
  @ApiResponse({ status: 200, description: 'Danh sách reviews' })
  getAllReviews(@Query() query: any) {
    return this.reviewsService.getAllReviews(query);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '[UC-A08] Admin - Duyệt/Từ chối review',
    description:
      'Admin approve hoặc reject review. Khi approve, rating sản phẩm sẽ được cập nhật tự động.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 404, description: 'Review không tồn tại' })
  updateReviewStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateReviewStatusDto) {
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId)) {
      throw new BadRequestException('ID review không hợp lệ');
    }
    return this.reviewsService.updateReviewStatus(reviewId, updateStatusDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[UC-A08] Admin - Xóa review',
    description: 'Admin xóa review (spam, không phù hợp). Rating sản phẩm sẽ được cập nhật lại.',
  })
  @ApiResponse({ status: 200, description: 'Xóa review thành công' })
  @ApiResponse({ status: 404, description: 'Review không tồn tại' })
  deleteReview(@Param('id') id: string) {
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId)) {
      throw new BadRequestException('ID review không hợp lệ');
    }
    return this.reviewsService.deleteReview(reviewId);
  }
}
