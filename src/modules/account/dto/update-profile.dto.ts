import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
