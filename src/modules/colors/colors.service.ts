import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from '../../entities/color.entity';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryBuilderService } from '../../common/services/query-builder.service';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private colorRepository: Repository<Color>,
    private queryBuilderService: QueryBuilderService,
  ) {}

  // GET /api/v1/admin/colors - Paginated list
  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const queryBuilder = this.colorRepository.createQueryBuilder('color');

    // Apply sorting
    this.queryBuilderService.applySort(queryBuilder, query.sort, 'color', ['name', 'id']);

    // Apply search
    this.queryBuilderService.applySearch(queryBuilder, query.search, 'color', ['name', 'hex_code']);

    // Apply pagination
    this.queryBuilderService.applyPagination(queryBuilder, { page, limit });

    return await this.queryBuilderService.executePaginatedQuery(queryBuilder, page, limit);
  }

  // GET /api/v1/admin/colors/all - All colors (for dropdown)
  async findAllForDropdown() {
    const colors = await this.colorRepository.find({
      order: { name: 'ASC' },
    });

    return colors.map(color => ({
      id: color.id,
      name: color.name,
      hex_code: color.hex_code,
    }));
  }

  // POST /api/v1/admin/colors - Create
  async create(createColorDto: CreateColorDto) {
    // Check duplicate name
    const existing = await this.colorRepository.findOne({
      where: { name: createColorDto.name },
    });

    if (existing) {
      throw new ConflictException('Tên màu đã tồn tại');
    }

    const color = this.colorRepository.create({
      name: createColorDto.name,
      hex_code: createColorDto.hex_code || null,
    });

    return await this.colorRepository.save(color);
  }

  // PUT /api/v1/admin/colors/:id - Update
  async update(id: number, updateColorDto: UpdateColorDto) {
    const color = await this.colorRepository.findOne({ where: { id: id as any } });

    if (!color) {
      throw new NotFoundException('Màu không tồn tại');
    }

    // Check duplicate name (if updating name)
    if (updateColorDto.name) {
      const existing = await this.colorRepository.findOne({
        where: { name: updateColorDto.name },
      });

      if (existing && Number(existing.id) !== id) {
        throw new ConflictException('Tên màu đã tồn tại');
      }

      color.name = updateColorDto.name;
    }

    if (updateColorDto.hex_code !== undefined) {
      color.hex_code = updateColorDto.hex_code;
    }

    return await this.colorRepository.save(color);
  }
}
