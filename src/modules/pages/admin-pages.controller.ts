import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin - CMS Pages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) { }

  @Post()
  @ApiOperation({
    summary: '[UC-A07] CMS - Tạo trang nội dung mới',
    description: 'Tạo trang tĩnh như "Về chúng tôi", "Chính sách đổi trả", "Điều khoản sử dụng"',
  })
  @ApiResponse({ status: 201, description: 'Tạo trang thành công' })
  @ApiResponse({ status: 409, description: 'Slug đã tồn tại' })
  createPage(@Body() createPageDto: CreatePageDto) {
    return this.pagesService.createPage(createPageDto);
  }

  @Get()
  @ApiOperation({
    summary: '[UC-A07] CMS - Danh sách tất cả trang',
    description: 'Lấy danh sách các trang để quản lý (title, slug, status, created_at)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách trang' })
  getAllPages() {
    return this.pagesService.getAllPages();
  }

  @Get(':id')
  @ApiOperation({
    summary: '[UC-A07] CMS - Chi tiết trang (để edit)',
    description: 'Lấy toàn bộ nội dung trang để chỉnh sửa',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết trang' })
  @ApiResponse({ status: 404, description: 'Trang không tồn tại' })
  getPageById(@Param('id') id: string) {
    const pageId = parseInt(id, 10);
    if (isNaN(pageId)) {
      throw new BadRequestException('ID trang không hợp lệ');
    }
    return this.pagesService.getPageById(pageId);
  }

  @Put(':id')
  @ApiOperation({
    summary: '[UC-A07] CMS - Cập nhật nội dung trang',
    description: 'Cập nhật title, slug, content, status của trang',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Trang không tồn tại' })
  @ApiResponse({ status: 409, description: 'Slug đã tồn tại' })
  updatePage(@Param('id') id: string, @Body() updatePageDto: UpdatePageDto) {
    const pageId = parseInt(id, 10);
    if (isNaN(pageId)) {
      throw new BadRequestException('ID trang không hợp lệ');
    }
    return this.pagesService.updatePage(pageId, updatePageDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[UC-A07] CMS - Xóa trang',
    description: 'Xóa trang khỏi hệ thống',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Trang không tồn tại' })
  deletePage(@Param('id') id: string) {
    const pageId = parseInt(id, 10);
    if (isNaN(pageId)) {
      throw new BadRequestException('ID trang không hợp lệ');
    }
    return this.pagesService.deletePage(pageId);
  }
}
