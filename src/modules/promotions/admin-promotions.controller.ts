import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminPromotionsService } from './admin-promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin - Promotions')
@Controller('api/v1/promotions')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminPromotionsController {
    constructor(private readonly adminPromotionsService: AdminPromotionsService) { }

    @Get()
    @ApiOperation({
        summary: 'Get all promotions with filter',
        description: 'Lấy danh sách tất cả promotions với filter và pagination',
    })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'expired', 'scheduled'] })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'search', required: false, description: 'Search by name' })
    @ApiResponse({ status: 200, description: 'Danh sách promotions' })
    findAll(@Query() query: any) {
        return this.adminPromotionsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get promotion by ID',
        description: 'Lấy chi tiết một promotion',
    })
    @ApiResponse({ status: 200, description: 'Chi tiết promotion' })
    @ApiResponse({ status: 404, description: 'Promotion not found' })
    findOne(@Param('id') id: string) {
        return this.adminPromotionsService.findOne(parseInt(id, 10));
    }

    @Post()
    @ApiOperation({
        summary: 'Create new promotion',
        description: 'Tạo mới promotion. Status sẽ tự động được tính dựa trên start_date và end_date.',
    })
    @ApiResponse({ status: 201, description: 'Promotion created successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    create(@Body() createPromotionDto: CreatePromotionDto) {
        return this.adminPromotionsService.create(createPromotionDto);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update promotion',
        description: 'Cập nhật promotion. Có thể manually thay đổi status hoặc để tự động tính.',
    })
    @ApiResponse({ status: 200, description: 'Promotion updated successfully' })
    @ApiResponse({ status: 404, description: 'Promotion not found' })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto) {
        return this.adminPromotionsService.update(parseInt(id, 10), updatePromotionDto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete promotion',
        description: 'Xóa promotion',
    })
    @ApiResponse({ status: 200, description: 'Promotion deleted successfully' })
    @ApiResponse({ status: 404, description: 'Promotion not found' })
    remove(@Param('id') id: string) {
        return this.adminPromotionsService.remove(parseInt(id, 10));
    }
}
