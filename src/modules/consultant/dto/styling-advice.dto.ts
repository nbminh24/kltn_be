import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StylingAdviceDto {
    @ApiProperty({ description: 'Dịp mặc (wedding, work, casual, party...)', example: 'wedding' })
    @IsNotEmpty()
    @IsString()
    occasion: string;

    @ApiProperty({ description: 'Phong cách (minimalist, street, vintage, elegant...)', example: 'minimalist' })
    @IsNotEmpty()
    @IsString()
    style: string;

    @ApiProperty({ description: 'Giới tính', example: 'male', enum: ['male', 'female', 'unisex'] })
    @IsNotEmpty()
    @IsString()
    gender: string;

    @ApiProperty({ description: 'Thời tiết/mùa (summer, winter, spring, fall)', example: 'summer', required: false })
    @IsOptional()
    @IsString()
    weather?: string;
}
