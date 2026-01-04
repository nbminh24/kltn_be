import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CustomerAddress } from '../../entities/customer-address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private addressRepository: Repository<CustomerAddress>,
  ) { }

  async getProfile(userId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'created_at'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return { data: customer };
  }

  async updateProfile(userId: number, updateData: UpdateProfileDto) {
    const customer = await this.customerRepository.findOne({ where: { id: userId } });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    Object.assign(customer, updateData);
    await this.customerRepository.save(customer);

    return {
      message: 'Profile updated successfully',
      data: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'password_hash'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(
      changePasswordDto.old_password,
      customer.password_hash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.new_password, 10);
    customer.password_hash = hashedPassword;
    await this.customerRepository.save(customer);

    return { message: 'Password changed successfully' };
  }

  // ==================== ADDRESSES ====================
  async getAddresses(userId: number) {
    const addresses = await this.addressRepository.find({
      where: { customer_id: userId },
      order: { is_default: 'DESC' },
    });

    return { data: addresses };
  }

  async createAddress(userId: number, createAddressDto: CreateAddressDto) {
    // If this is marked as default, unset other defaults
    if (createAddressDto.is_default) {
      await this.addressRepository.update(
        { customer_id: userId, is_default: true },
        { is_default: false },
      );
    }

    const address = this.addressRepository.create({
      customer_id: userId,
      province: createAddressDto.province,
      district: createAddressDto.district,
      ward: createAddressDto.ward,
      street_address: createAddressDto.street_address,
      phone_number: createAddressDto.phone_number,
      latitude: createAddressDto.latitude,
      longitude: createAddressDto.longitude,
      address_source: createAddressDto.address_source || 'manual',
      address_type: createAddressDto.address_type || 'Home',
      is_default: createAddressDto.is_default || false,
    });

    await this.addressRepository.save(address);

    return {
      message: 'Địa chỉ đã được thêm',
      data: address,
    };
  }

  async updateAddress(userId: number, addressId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.addressRepository.findOne({
      where: { id: parseInt(addressId), customer_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    // If setting as default, unset other defaults
    if (updateAddressDto.is_default) {
      await this.addressRepository.update(
        { customer_id: userId, is_default: true },
        { is_default: false },
      );
    }

    Object.assign(address, updateAddressDto);
    await this.addressRepository.save(address);

    return {
      message: 'Cập nhật địa chỉ thành công',
      data: address,
    };
  }

  async deleteAddress(userId: number, addressId: string) {
    const result = await this.addressRepository.delete({
      id: parseInt(addressId),
      customer_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    return { message: 'Xóa địa chỉ thành công' };
  }
}
