import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for Gemini AI question API
 */
export class GeminiAskDto {
    @ApiProperty({
        example: 'What is the best fabric for summer clothing?',
        description: 'Question to ask Gemini AI'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    question: string;
}
