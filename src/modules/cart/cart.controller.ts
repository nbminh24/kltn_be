import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@ApiTags('🛒 Customer - Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ 
    summary: '[UC-C10] Xem giỏ hàng',
    description: 'Lấy danh sách tất cả variants trong giỏ hàng của khách hàng. Bao gồm thông tin sản phẩm, size, color, số lượng và tổng tiền.'
  })
  @ApiResponse({ status: 200, description: 'Giỏ hàng với danh sách sản phẩm và tổng giá' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.sub);
  }

  @Post('items')
  @ApiOperation({ 
    summary: '[UC-C10] Thêm vào giỏ hàng',
    description: 'Thêm variant vào giỏ hàng. Nếu variant đã tồn tại, tăng số lượng (cộng dồn). Kiểm tra tồn kho trước khi thêm.'
  })
  @ApiResponse({ status: 201, description: 'Thêm vào giỏ thành công' })
  @ApiResponse({ status: 400, description: 'Không đủ hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy variant' })
  addItem(@CurrentUser() user: any, @Body() body: AddToCartDto) {
    return this.cartService.addItem(user.sub, {
      variant_id: body.variant_id,
      quantity: body.quantity || 1,
    });
  }

  @Put('items/:id')
  @ApiOperation({ 
    summary: '[UC-C10] Cập nhật số lượng',
    description: 'Thay đổi số lượng của một cart item. Kiểm tra tồn kho khả dụng trước khi cập nhật.'
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Không đủ hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cart item' })
  updateItem(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateCartItemDto) {
    return this.cartService.updateItem(user.sub, parseInt(id), body.quantity);
  }

  @Delete('items/:id')
  @ApiOperation({ 
    summary: '[UC-C10] Xóa khỏi giỏ hàng',
    description: 'Xóa một cart item khỏi giỏ hàng của khách hàng.'
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cart item' })
  removeItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cartService.removeItem(user.sub, parseInt(id));
  }

  @Post('apply-coupon')
  @ApiOperation({ 
    summary: 'Áp dụng mã giảm giá (Coming soon)',
    description: 'Kiểm tra và áp dụng mã giảm giá (coupon) cho giỏ hàng. Tính năng đang phát triển.'
  })
  @ApiResponse({ status: 200, description: 'Mã giảm giá hợp lệ' })
  @ApiResponse({ status: 400, description: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' })
  applyCoupon(@CurrentUser() user: any, @Body() body: ApplyCouponDto) {
    return this.cartService.applyCoupon(user.sub, body.code);
  }
}
