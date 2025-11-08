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
    summary: 'Danh sách sản phẩm yêu thích',
    description: 'Lấy tất cả sản phẩm trong danh sách yêu thích của user. Bao gồm thông tin sản phẩm, giá, ảnh và danh mục.'
  })
  @ApiResponse({ status: 200, description: 'Danh sách wishlist' })
  getWishlist(@CurrentUser() user: any) {
    return this.wishlistService.getWishlist(user.userId);
  }

  @Post()
  @ApiOperation({ 
    summary: 'Thêm sản phẩm vào wishlist',
    description: 'Thêm một sản phẩm vào danh sách yêu thích. Không thêm nếu sản phẩm đã tồn tại.'
  })
  @ApiResponse({ status: 201, description: 'Thêm vào wishlist thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @ApiResponse({ status: 409, description: 'Sản phẩm đã có trong wishlist' })
  addToWishlist(@CurrentUser() user: any, @Body() body: AddToWishlistDto) {
    return this.wishlistService.addToWishlist(user.userId, body.product_id);
  }

  @Delete(':productId')
  @ApiOperation({ 
    summary: 'Xóa sản phẩm khỏi wishlist',
    description: 'Xóa một sản phẩm khỏi danh sách yêu thích của user.'
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm trong wishlist' })
  removeFromWishlist(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(user.userId, productId);
  }
}
