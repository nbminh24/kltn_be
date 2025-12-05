import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;  // ✅ Changed from 'full_name' to 'name' to match entity

  // Note: Phone field removed - customers table has no phone column
  // Phone is stored in customer_addresses table instead
}
