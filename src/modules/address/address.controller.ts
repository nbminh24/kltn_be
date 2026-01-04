import { Controller, Get, Post, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { ProvinceDto, CommuneDto, DistrictDto, WardDto } from './dto/province.dto';
import { ReverseGeocodeDto, ReverseGeocodeResponseDto } from './dto/reverse-geocode.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('📍 Address')
@Controller('api/v1/address')
@Public()
export class AddressController {
    constructor(private readonly addressService: AddressService) { }

    @Get('provinces')
    @ApiOperation({
        summary: 'Lấy danh sách tỉnh/thành phố',
        description: 'Lấy tất cả tỉnh/thành phố tại Việt Nam (cấu trúc mới sau sáp nhập 7/2025)',
    })
    @ApiQuery({
        name: 'effectiveDate',
        required: false,
        type: String,
        example: 'latest',
        description: 'Ngày hiệu lực ("latest" hoặc "YYYY-MM-DD"), mặc định: latest',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách tỉnh/thành phố',
        type: [ProvinceDto],
    })
    async getProvinces(
        @Query('effectiveDate') effectiveDate?: string,
    ): Promise<ProvinceDto[]> {
        return this.addressService.getProvinces(effectiveDate);
    }

    @Get('districts')
    @ApiOperation({
        summary: 'Lấy danh sách quận/huyện theo tỉnh',
        description: 'Lấy tất cả quận/huyện thuộc tỉnh/thành phố',
    })
    @ApiQuery({
        name: 'province_code',
        required: true,
        type: Number,
        example: 1,
        description: 'Mã tỉnh/thành phố',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách quận/huyện',
        type: [DistrictDto],
    })
    async getDistricts(
        @Query('province_code', ParseIntPipe) provinceCode: number,
    ): Promise<DistrictDto[]> {
        return this.addressService.getDistrictsByProvince(provinceCode);
    }

    @Get('wards')
    @ApiOperation({
        summary: 'Lấy danh sách xã/phường theo tỉnh',
        description: 'Lấy tất cả xã/phường thuộc tỉnh/thành phố (cấu trúc mới: Tỉnh → Xã, không có huyện)',
    })
    @ApiQuery({
        name: 'province_code',
        required: true,
        type: String,
        example: '01',
        description: 'Mã tỉnh/thành phố (dạng string: "01", "79", ...)',
    })
    @ApiQuery({
        name: 'effectiveDate',
        required: false,
        type: String,
        example: 'latest',
        description: 'Ngày hiệu lực ("latest" hoặc "YYYY-MM-DD"), mặc định: latest',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách xã/phường',
        type: [CommuneDto],
    })
    async getWards(
        @Query('province_code') provinceCode: string,
        @Query('effectiveDate') effectiveDate?: string,
    ): Promise<CommuneDto[]> {
        return this.addressService.getCommunesByProvince(provinceCode, effectiveDate);
    }

    @Post('reverse-geocode')
    @ApiOperation({
        summary: 'Chuyển tọa độ GPS thành địa chỉ',
        description: 'Sử dụng Nominatim (OpenStreetMap) để reverse geocoding',
    })
    @ApiResponse({
        status: 200,
        description: 'Địa chỉ từ tọa độ',
        type: ReverseGeocodeResponseDto,
    })
    async reverseGeocode(
        @Body() dto: ReverseGeocodeDto,
    ): Promise<ReverseGeocodeResponseDto> {
        return this.addressService.reverseGeocode(dto);
    }

    @Get('search')
    @ApiOperation({
        summary: 'Tìm kiếm địa chỉ (autocomplete)',
        description: 'Tìm kiếm địa chỉ theo text query',
    })
    @ApiQuery({
        name: 'q',
        required: true,
        type: String,
        example: 'Hoàng Diệu, Hà Nội',
        description: 'Từ khóa tìm kiếm',
    })
    async searchAddress(@Query('q') query: string) {
        return this.addressService.searchAddress(query);
    }
}
