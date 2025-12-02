import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiPropertyOptional({ description: 'Visitor UUID for guest users' })
    @IsOptional()
    @IsString()
    visitor_id?: string;
}
