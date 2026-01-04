import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class ReverseGeocodeDto {
    @ApiProperty({
        example: 21.0285,
        description: 'Latitude (vĩ độ)',
        minimum: -90,
        maximum: 90,
    })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({
        example: 105.8542,
        description: 'Longitude (kinh độ)',
        minimum: -180,
        maximum: 180,
    })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;
}

export class ReverseGeocodeResponseDto {
    @ApiProperty({ example: 'Hà Nội', description: 'Province/City name' })
    province: string;

    @ApiProperty({ example: 'Quận Ba Đình', description: 'District name', nullable: true })
    district: string;

    @ApiProperty({ example: 'Phường Ngọc Hà', description: 'Ward name', nullable: true })
    ward: string;

    @ApiProperty({ example: 'Đường Hoàng Diệu', description: 'Street/detailed address', nullable: true })
    street_address: string;

    @ApiProperty({ example: 'Hoàng Diệu, Ngọc Hà, Ba Đình, Hà Nội, Việt Nam', description: 'Full formatted address' })
    display_name: string;
}
