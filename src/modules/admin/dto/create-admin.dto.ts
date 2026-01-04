import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({
    example: 'Admin User',
    description: 'Tên của admin',
  })
  @IsString({ message: 'Tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  name: string;

  @ApiProperty({
    example: 'admin@shop.com',
    description: 'Email của admin',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123',
    description: 'Mật khẩu của admin (tối thiểu 8 ký tự)',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @ApiProperty({
    example: 'admin',
    description: 'Vai trò của admin',
    enum: ['admin', 'super_admin'],
    required: false,
    default: 'admin',
  })
  @IsOptional()
  @IsString({ message: 'Role phải là chuỗi' })
  @IsIn(['admin', 'super_admin'], { message: 'Role phải là admin hoặc super_admin' })
  role?: string;
}
