import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Xem giỏ hàng',
    description: 'Lấy danh sách tất cả sản phẩm trong giỏ hàng của user. Bao gồm thông tin sản phẩm, biến thể, số lượng và tổng tiền.'
  })
  @ApiResponse({ status: 200, description: 'Giỏ hàng với danh sách sản phẩm và tổng giá' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  @ApiOperation({ 
    summary: 'Thêm sản phẩm vào giỏ hàng',
    description: 'Thêm sản phẩm vào giỏ hàng. Nếu sản phẩm đã tồn tại, tăng số lượng. Có thể chỉ định biến thể (màu, size).'
  })
  @ApiResponse({ status: 201, description: 'Thêm vào giỏ thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  addItem(@CurrentUser() user: any, @Body() body: AddToCartDto) {
    return this.cartService.addItem(user.userId, {
      variant_id: body.variant_id,
      quantity: body.quantity || 1,
    });
  }

  @Put('items/:id')
  @ApiOperation({ 
    summary: 'Cập nhật số lượng sản phẩm',
    description: 'Thay đổi số lượng của một sản phẩm đã có trong giỏ hàng.'
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm trong giỏ' })
  updateItem(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateCartItemDto) {
    return this.cartService.updateItem(user.userId, parseInt(id), body.quantity);
  }

  @Delete('items/:id')
  @ApiOperation({ 
    summary: 'Xóa sản phẩm khỏi giỏ hàng',
    description: 'Xóa một sản phẩm khỏi giỏ hàng của user.'
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm trong giỏ' })
  removeItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cartService.removeItem(user.userId, parseInt(id));
  }

  @Post('apply-coupon')
  @ApiOperation({ 
    summary: 'Áp dụng mã giảm giá',
    description: 'Kiểm tra và áp dụng mã giảm giá (promo code) cho giỏ hàng. Trả về thông tin giảm giá và điều kiện sử dụng.'
  })
  @ApiResponse({ status: 200, description: 'Mã giảm giá hợp lệ' })
  @ApiResponse({ status: 400, description: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' })
  applyCoupon(@CurrentUser() user: any, @Body() body: ApplyCouponDto) {
    return this.cartService.applyCoupon(user.userId, body.code);
  }
}
