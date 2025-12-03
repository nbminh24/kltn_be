import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublicResetPasswordDto {
    @ApiProperty({
        example: 'admin@shop.com',
        description: 'Email của admin cần reset password',
    })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @ApiProperty({
        example: 'NewSecurePassword123',
        description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
    })
    @IsString({ message: 'Mật khẩu phải là chuỗi' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    new_password: string;

    @ApiProperty({
        example: 'your-secret-reset-code',
        description: 'Secret code để xác thực (lấy từ biến môi trường ADMIN_RESET_SECRET)',
        required: false,
    })
    @IsString({ message: 'Secret code phải là chuỗi' })
    @IsNotEmpty({ message: 'Secret code không được để trống' })
    secret_code: string;
}
