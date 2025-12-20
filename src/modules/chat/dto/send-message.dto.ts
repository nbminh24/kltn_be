import { IsNotEmpty, IsNumber, IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiProperty({ description: 'Chat session ID' })
    @IsNotEmpty()
    @IsNumber()
    session_id: number;

    @ApiProperty({ description: 'Message content' })
    @IsNotEmpty()
    @IsString()
    message: string;

    @ApiProperty({
        description: 'Image URL for image search (optional)',
        required: false,
        example: 'https://res.cloudinary.com/doticibcy/image/upload/...'
    })
    @IsOptional()
    @IsUrl()
    image_url?: string;
}
