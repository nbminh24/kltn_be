import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAddress } from '../../entities/customer-address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(CustomerAddress)
    private addressRepository: Repository<CustomerAddress>,
  ) {}

  async findAll(customerId: number) {
    const addresses = await this.addressRepository.find({
      where: { customer_id: customerId },
      order: { is_default: 'DESC' },
    });

    return { addresses };
  }

  async create(customerId: number, data: any) {
    if (data.is_default) {
      await this.addressRepository.update({ customer_id: customerId }, { is_default: false });
    }

    const address = this.addressRepository.create({
      customer_id: customerId,
      ...data,
    });

    await this.addressRepository.save(address);
    return { message: 'Address created', address };
  }

  async update(customerId: number, addressId: number, data: any) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, customer_id: customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (data.is_default && !address.is_default) {
      await this.addressRepository.update({ customer_id: customerId }, { is_default: false });
    }

    Object.assign(address, data);
    await this.addressRepository.save(address);
    return { message: 'Address updated', address };
  }

  async delete(customerId: number, addressId: number) {
    const result = await this.addressRepository.delete({ id: addressId, customer_id: customerId });

    if (result.affected === 0) {
      throw new NotFoundException('Address not found');
    }

    return { message: 'Address deleted' };
  }
}
