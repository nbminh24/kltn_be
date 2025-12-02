import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeSessionDto {
    @ApiProperty({ description: 'Visitor UUID to merge' })
    @IsNotEmpty()
    @IsString()
    visitor_id: string;
}
