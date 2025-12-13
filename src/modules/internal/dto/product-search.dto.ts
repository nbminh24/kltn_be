import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ProductSearchDto {
    @ApiPropertyOptional({
        description: 'Search query (text). Optional để chatbot gửi dần theo hội thoại.',
        example: 'relaxed fit t-shirt',
    })
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({
        description: 'Category slug',
        example: 't-shirt',
    })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({
        description: 'Filter by color names. Case-insensitive partial match.',
        example: ['white', 'cream'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        if (Array.isArray(value)) return value;
        return [value];
    })
    colors?: string[];

    @ApiPropertyOptional({
        description: 'Filter by size names (e.g., S/M/L/XL).',
        example: ['L'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        if (Array.isArray(value)) return value;
        return [value];
    })
    sizes?: string[];

    @ApiPropertyOptional({
        description: 'Minimum selling price',
        example: 200000,
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    min_price?: number;

    @ApiPropertyOptional({
        description: 'Maximum selling price',
        example: 400000,
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    max_price?: number;

    @ApiPropertyOptional({
        description: 'Only return products that have at least one available variant in stock',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === '1';
    })
    in_stock?: boolean;

    @ApiPropertyOptional({
        description: 'Max number of results returned',
        example: 5,
        default: 5,
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    @Max(50)
    limit?: number;
}
