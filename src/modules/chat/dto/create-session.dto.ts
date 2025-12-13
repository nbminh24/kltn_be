import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiPropertyOptional({ description: 'Visitor UUID for guest users' })
    @IsOptional()
    @IsString()
    visitor_id?: string;

    @ApiPropertyOptional({ description: 'Force create new session (ChatGPT-style new conversation)', default: false })
    @IsOptional()
    @IsBoolean()
    force_new?: boolean;
}
