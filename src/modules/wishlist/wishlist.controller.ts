import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@ApiTags('Wishlist')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ 
    summary: '[UC-C9] Danh sách sản phẩm yêu thích',
    description: 'Lấy tất cả variants trong danh sách yêu thích của khách hàng. Bao gồm thông tin sản phẩm, size, color, ảnh và danh mục.'
  })
  @ApiResponse({ status: 200, description: 'Danh sách wishlist' })
  getWishlist(@CurrentUser() user: any) {
    return this.wishlistService.getWishlist(user.sub);
  }

  @Post('toggle')
  @ApiOperation({ 
    summary: '[UC-C9] Toggle wishlist (Thêm/Xóa)',
    description: 'Nếu variant chưa có trong wishlist thì thêm vào, nếu đã có thì xóa khỏi. Trả về trạng thái mới (added/removed).'
  })
  @ApiResponse({ status: 200, description: 'Toggle thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy variant' })
  toggleWishlist(@CurrentUser() user: any, @Body() body: AddToWishlistDto) {
    return this.wishlistService.toggleWishlist(user.sub, body.variant_id);
  }

  @Delete(':variantId')
  @ApiOperation({ 
    summary: '[UC-C9] Xóa variant khỏi wishlist',
    description: 'Xóa một variant khỏi danh sách yêu thích của khách hàng.'
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy variant trong wishlist' })
  removeFromWishlist(@CurrentUser() user: any, @Param('variantId') variantId: string) {
    return this.wishlistService.removeFromWishlist(user.sub, parseInt(variantId));
  }
}
