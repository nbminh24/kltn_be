import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductNotificationDto {
    @ApiProperty({ description: 'Email để nhận thông báo', example: 'user@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ description: 'Size cần nhận thông báo', example: 'M' })
    @IsOptional()
    @IsString()
    size?: string;

    @ApiPropertyOptional({ description: 'Ngưỡng giá để nhận thông báo (VNĐ)', example: 500000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price_condition?: number;
}
