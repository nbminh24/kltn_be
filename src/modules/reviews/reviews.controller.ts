import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('⭐ Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[UC-C08] Gửi đánh giá sản phẩm',
    description:
      'Khách hàng gửi đánh giá cho sản phẩm đã mua. Review sẽ ở trạng thái pending cho đến khi admin duyệt.',
  })
  @ApiResponse({ status: 201, description: 'Gửi review thành công' })
  @ApiResponse({ status: 403, description: 'Bạn không có quyền đánh giá sản phẩm này' })
  @ApiResponse({ status: 409, description: 'Bạn đã đánh giá sản phẩm này rồi' })
  createReview(@CurrentUser() user: any, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(user.sub, createReviewDto);
  }

  @Get('account/reviewable-items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[UC-C08] Lấy danh sách sản phẩm có thể đánh giá',
    description: 'Hiển thị các sản phẩm khách hàng đã mua nhưng chưa đánh giá',
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm có thể đánh giá' })
  getReviewableItems(@CurrentUser() user: any) {
    return this.reviewsService.getReviewableItems(user.sub);
  }

  @Get('customers/me/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lấy reviews đã viết',
    description: 'Lấy danh sách tất cả reviews mà khách hàng đã viết.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách reviews' })
  getMyReviews(@CurrentUser() user: any) {
    return this.reviewsService.getMyReviews(user.sub);
  }
}
