import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PagesService } from './pages.service';

@ApiTags('Pages (Public)')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Xem nội dung trang tĩnh',
    description: 'API công khai để khách hàng xem nội dung các trang như "Về chúng tôi", "Chính sách đổi trả", v.v.',
  })
  @ApiResponse({ status: 200, description: 'Nội dung trang' })
  @ApiResponse({ status: 404, description: 'Trang không tồn tại hoặc chưa publish' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.pagesService.getPageBySlug(slug);
  }
}
