import { ApiProperty } from '@nestjs/swagger';

// New NSO/CASSO API DTOs (Province → Commune structure)
export class ProvinceDto {
    @ApiProperty({ example: '01', description: 'Province code' })
    code: string;

    @ApiProperty({ example: 'Thành phố Hà Nội', description: 'Province name' })
    name: string;

    @ApiProperty({ example: 'Ha Noi City', description: 'English name', required: false })
    englishName?: string;

    @ApiProperty({ example: 'Thành phố Trung ương', description: 'Administrative level', required: false })
    administrativeLevel?: string;

    @ApiProperty({ example: '202/2025/QH15 - 12/06/2025', description: 'Decree number and date', required: false })
    decree?: string;
}

export class CommuneDto {
    @ApiProperty({ example: '00004', description: 'Commune code' })
    code: string;

    @ApiProperty({ example: 'Phường Ba Đình', description: 'Commune name' })
    name: string;

    @ApiProperty({ example: 'Ba Dinh Ward', description: 'English name', required: false })
    englishName?: string;

    @ApiProperty({ example: 'Phường', description: 'Administrative level (Phường/Xã/Thị trấn)', required: false })
    administrativeLevel?: string;

    @ApiProperty({ example: '01', description: 'Province code', required: false })
    provinceCode?: string;

    @ApiProperty({ example: 'Thành phố Hà Nội', description: 'Province name', required: false })
    provinceName?: string;

    @ApiProperty({ example: 'Số: 1656/NQ-UBTVQH15; Ngày: 16/06/2025', description: 'Decree', required: false })
    decree?: string;
}

// Legacy DTOs (deprecated - kept for backwards compatibility)
export class DistrictDto {
    @ApiProperty({ example: 1, description: 'District code (deprecated)' })
    code: number;

    @ApiProperty({ example: 'Quận Ba Đình', description: 'District name' })
    name: string;

    @ApiProperty({ example: 'Quan Ba Dinh', description: 'Name with type' })
    name_with_type: string;

    @ApiProperty({ example: 'Quận', description: 'Division type' })
    division_type: string;

    @ApiProperty({ example: 'ba_dinh', description: 'Code name' })
    codename: string;

    @ApiProperty({ example: 1, description: 'Province code' })
    province_code: number;
}

export class WardDto {
    @ApiProperty({ example: 1, description: 'Ward code (deprecated)' })
    code: number;

    @ApiProperty({ example: 'Phường Phúc Xá', description: 'Ward name' })
    name: string;

    @ApiProperty({ example: 'Phuong Phuc Xa', description: 'Name with type' })
    name_with_type: string;

    @ApiProperty({ example: 'Phường', description: 'Division type' })
    division_type: string;

    @ApiProperty({ example: 'phuc_xa', description: 'Code name' })
    codename: string;

    @ApiProperty({ example: 1, description: 'District code' })
    district_code: number;
}
