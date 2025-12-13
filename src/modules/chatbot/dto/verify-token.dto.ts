import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenDto {
    @ApiProperty({
        description: 'JWT token to verify',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    @IsString()
    @IsNotEmpty()
    jwt_token: string;
}
