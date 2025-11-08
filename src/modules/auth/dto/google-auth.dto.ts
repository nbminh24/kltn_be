import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Authorization code từ Google OAuth',
    example: '4/0AY0e-g7xxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  auth_code: string;
}
