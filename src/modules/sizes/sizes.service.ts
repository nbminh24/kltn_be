import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Size } from '../../entities/size.entity';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { QueryBuilderService } from '../../common/services/query-builder.service';

@Injectable()
export class SizesService {
  constructor(
    @InjectRepository(Size)
    private sizeRepository: Repository<Size>,
    private queryBuilderService: QueryBuilderService,
  ) {}

  // GET /api/v1/admin/sizes - Paginated list
  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const queryBuilder = this.sizeRepository.createQueryBuilder('size');

    // Apply sorting
    this.queryBuilderService.applySort(
      queryBuilder,
      query.sort,
      'size',
      ['name', 'sort_order'],
    );

    // Apply search
    this.queryBuilderService.applySearch(
      queryBuilder,
      query.search,
      'size',
      ['name'],
    );

    // Apply pagination
    this.queryBuilderService.applyPagination(queryBuilder, { page, limit });

    return await this.queryBuilderService.executePaginatedQuery(
      queryBuilder,
      page,
      limit,
    );
  }

  // GET /api/v1/admin/sizes/all - All sizes (for dropdown)
  async findAllForDropdown() {
    const sizes = await this.sizeRepository.find({
      order: { sort_order: 'ASC', name: 'ASC' },
    });

    return sizes.map((size) => ({
      id: size.id,
      name: size.name,
      sort_order: size.sort_order,
    }));
  }

  // POST /api/v1/admin/sizes - Create
  async create(createSizeDto: CreateSizeDto) {
    // Check duplicate name
    const existing = await this.sizeRepository.findOne({
      where: { name: createSizeDto.name },
    });

    if (existing) {
      throw new ConflictException('Tên size đã tồn tại');
    }

    const size = this.sizeRepository.create({
      name: createSizeDto.name,
      sort_order: createSizeDto.sort_order ?? 0,
    });

    return await this.sizeRepository.save(size);
  }

  // PUT /api/v1/admin/sizes/:id - Update
  async update(id: number, updateSizeDto: UpdateSizeDto) {
    const size = await this.sizeRepository.findOne({ where: { id: id as any } });

    if (!size) {
      throw new NotFoundException('Size không tồn tại');
    }

    // Check duplicate name (if updating name)
    if (updateSizeDto.name) {
      const existing = await this.sizeRepository.findOne({
        where: { name: updateSizeDto.name },
      });

      if (existing && Number(existing.id) !== id) {
        throw new ConflictException('Tên size đã tồn tại');
      }

      size.name = updateSizeDto.name;
    }

    if (updateSizeDto.sort_order !== undefined) {
      size.sort_order = updateSizeDto.sort_order;
    }

    return await this.sizeRepository.save(size);
  }
}
