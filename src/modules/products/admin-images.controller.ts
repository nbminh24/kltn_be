import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Body,
  ParseBoolPipe,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductImagesService } from './product-images.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin - Images')
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminImagesController {
  constructor(private readonly imagesService: ProductImagesService) {}

  @Post('variants/:id/images')
  @ApiOperation({
    summary: 'Upload hình ảnh cho variant',
    description: 'Upload 1 hoặc nhiều hình ảnh. Trigger fn_update_product_thumbnail sẽ tự động cập nhật ảnh bìa sản phẩm.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        is_main: {
          type: 'boolean',
          description: 'Đặt ảnh đầu tiên làm ảnh chính',
          default: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload thành công',
    schema: {
      example: {
        message: 'Upload thành công',
        images: [
          { id: 101, image_url: 'https://...', is_main: true },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Variant không tồn tại' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('is_main') isMain?: string,
  ) {
    const isMainBool = isMain === 'true';
    return this.imagesService.uploadImages(parseInt(id), files, isMainBool);
  }

  @Delete('images/:id')
  @ApiOperation({
    summary: 'Xóa hình ảnh',
    description: 'Xóa ảnh khỏi variant và Supabase Storage. Trigger fn_update_product_thumbnail sẽ tự động cập nhật ảnh bìa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({ status: 404, description: 'Image không tồn tại' })
  deleteImage(@Param('id') id: string) {
    return this.imagesService.deleteImage(parseInt(id));
  }
}
