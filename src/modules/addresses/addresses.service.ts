import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../../entities/address.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async findAll(userId: string) {
    const addresses = await this.addressRepository.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });

    return { addresses };
  }

  async create(userId: string, data: any) {
    if (data.is_default) {
      await this.addressRepository.update({ user_id: userId }, { is_default: false });
    }

    const address = this.addressRepository.create({
      id: IdGenerator.generate('addr'),
      user_id: userId,
      ...data,
    });

    await this.addressRepository.save(address);
    return { message: 'Address created', address };
  }

  async update(userId: string, addressId: string, data: any) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (data.is_default && !address.is_default) {
      await this.addressRepository.update({ user_id: userId }, { is_default: false });
    }

    Object.assign(address, data);
    await this.addressRepository.save(address);
    return { message: 'Address updated', address };
  }

  async delete(userId: string, addressId: string) {
    const result = await this.addressRepository.delete({ id: addressId, user_id: userId });

    if (result.affected === 0) {
      throw new NotFoundException('Address not found');
    }

    return { message: 'Address deleted' };
  }
}
