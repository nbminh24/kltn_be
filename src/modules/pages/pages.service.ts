import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from '../../entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
  ) {}

  // Admin: Create a new page
  async createPage(createPageDto: CreatePageDto) {
    // Check if slug already exists
    const existing = await this.pageRepository.findOne({
      where: { slug: createPageDto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    const page = this.pageRepository.create(createPageDto);
    const savedPage = await this.pageRepository.save(page);

    return {
      message: 'Page created successfully',
      page: savedPage,
    };
  }

  // Admin: Get all pages
  async getAllPages() {
    const pages = await this.pageRepository.find({
      select: ['id', 'title', 'slug', 'status', 'created_at', 'updated_at'],
      order: { created_at: 'DESC' },
    });

    return { data: pages };
  }

  // Admin: Get page by ID (for editing)
  async getPageById(id: number) {
    const page = await this.pageRepository.findOne({ where: { id } });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  // Admin: Update page
  async updatePage(id: number, updatePageDto: UpdatePageDto) {
    const page = await this.pageRepository.findOne({ where: { id } });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Check slug uniqueness if slug is being updated
    if (updatePageDto.slug && updatePageDto.slug !== page.slug) {
      const existing = await this.pageRepository.findOne({
        where: { slug: updatePageDto.slug },
      });

      if (existing) {
        throw new ConflictException('Slug already exists');
      }
    }

    Object.assign(page, updatePageDto);
    const updatedPage = await this.pageRepository.save(page);

    return {
      message: 'Page updated successfully',
      page: updatedPage,
    };
  }

  // Admin: Delete page
  async deletePage(id: number) {
    const page = await this.pageRepository.findOne({ where: { id } });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.pageRepository.delete(id);

    return { message: 'Page deleted successfully' };
  }

  // Public: Get page by slug
  async getPageBySlug(slug: string) {
    const page = await this.pageRepository.findOne({
      where: { slug, status: 'Published' },
      select: ['title', 'content', 'updated_at'],
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }
}
