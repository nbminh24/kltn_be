import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for product recommendation API
 */
export class ProductRecommendDto {
    @ApiProperty({
        example: 'wedding',
        description: 'Context or occasion for recommendation (wedding, beach, work, party, casual, sport)',
        required: false
    })
    @IsString()
    @IsOptional()
    context?: string;

    @ApiProperty({
        example: 'shirt',
        description: 'Product category filter',
        required: false
    })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiProperty({
        example: 5,
        description: 'Number of recommendations to return',
        default: 5,
        required: false
    })
    @IsInt()
    @Min(1)
    @Max(20)
    @IsOptional()
    limit?: number = 5;
}
