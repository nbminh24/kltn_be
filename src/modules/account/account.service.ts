import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { Address } from '../../entities/address.entity';
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
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

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
      where: { user_id: userId.toString() },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });

    return { data: addresses };
  }

  async createAddress(userId: number, createAddressDto: CreateAddressDto) {
    // If this is marked as default, unset other defaults
    if (createAddressDto.is_default) {
      await this.addressRepository.update(
        { user_id: userId.toString(), is_default: true },
        { is_default: false },
      );
    }

    const address = this.addressRepository.create({
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId.toString(),
      name: createAddressDto.recipient_name,
      address: createAddressDto.address_line,
      city: createAddressDto.city,
      state: createAddressDto.district,
      postal_code: createAddressDto.postal_code || '',
      phone: createAddressDto.recipient_phone,
      is_default: createAddressDto.is_default || false,
    });

    await this.addressRepository.save(address);

    return {
      message: 'Address created successfully',
      data: address,
    };
  }

  async updateAddress(userId: number, addressId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId.toString() },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset other defaults
    if (updateAddressDto.is_default) {
      await this.addressRepository.update(
        { user_id: userId.toString(), is_default: true },
        { is_default: false },
      );
    }

    if (updateAddressDto.recipient_name) address.name = updateAddressDto.recipient_name;
    if (updateAddressDto.address_line) address.address = updateAddressDto.address_line;
    if (updateAddressDto.city) address.city = updateAddressDto.city;
    if (updateAddressDto.district) address.state = updateAddressDto.district;
    if (updateAddressDto.postal_code) address.postal_code = updateAddressDto.postal_code;
    if (updateAddressDto.recipient_phone) address.phone = updateAddressDto.recipient_phone;
    if (updateAddressDto.is_default !== undefined) address.is_default = updateAddressDto.is_default;

    await this.addressRepository.save(address);

    return {
      message: 'Address updated successfully',
      data: address,
    };
  }

  async deleteAddress(userId: number, addressId: string) {
    const result = await this.addressRepository.delete({
      id: addressId,
      user_id: userId.toString(),
    });

    if (result.affected === 0) {
      throw new NotFoundException('Address not found');
    }

    return { message: 'Address deleted successfully' };
  }
}
