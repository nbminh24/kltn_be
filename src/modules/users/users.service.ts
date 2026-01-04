import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Customer } from '../../entities/customer.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async getProfile(userId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'created_at', 'status'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return { user: customer };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const customer = await this.customerRepository.findOne({ where: { id: userId } });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (updateProfileDto.name) {
      customer.name = updateProfileDto.name;
    }

    await this.customerRepository.save(customer);

    return {
      message: 'Profile updated successfully',
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
      },
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .addSelect('customer.password_hash')
      .where('customer.id = :userId', { userId })
      .getOne();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      customer.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    customer.password_hash = hashedPassword;

    await this.customerRepository.save(customer);

    return {
      message: 'Password changed successfully',
    };
  }
}
