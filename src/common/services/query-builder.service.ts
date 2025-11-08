import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sort?: string; // Format: "field_direction,field2_direction" e.g., "name_asc,created_at_desc"
}

export interface SearchParams {
  search?: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class QueryBuilderService {
  /**
   * Apply pagination to query builder
   */
  applyPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    params: PaginationParams,
  ): { skip: number; take: number } {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    return { skip, take: limit };
  }

  /**
   * Apply sorting to query builder
   * @param sort Format: "name_asc,created_at_desc"
   */
  applySort<T>(
    queryBuilder: SelectQueryBuilder<T>,
    sortParam: string | undefined,
    alias: string,
    allowedFields: string[],
  ): void {
    if (!sortParam) return;

    const sorts = sortParam.split(',');
    let isFirst = true;

    for (const sortItem of sorts) {
      const [field, direction] = sortItem.split('_');
      
      if (!allowedFields.includes(field)) continue;
      if (direction !== 'asc' && direction !== 'desc') continue;

      const column = `${alias}.${field}`;
      
      if (isFirst) {
        queryBuilder.orderBy(column, direction.toUpperCase() as 'ASC' | 'DESC');
        isFirst = false;
      } else {
        queryBuilder.addOrderBy(column, direction.toUpperCase() as 'ASC' | 'DESC');
      }
    }
  }

  /**
   * Apply search to query builder
   */
  applySearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    searchTerm: string | undefined,
    alias: string,
    searchableFields: string[],
  ): void {
    if (!searchTerm || !searchTerm.trim()) return;

    const conditions = searchableFields
      .map((field) => `LOWER(${alias}.${field}) LIKE LOWER(:searchTerm)`)
      .join(' OR ');

    if (conditions) {
      queryBuilder.andWhere(`(${conditions})`, {
        searchTerm: `%${searchTerm.trim()}%`,
      });
    }
  }

  /**
   * Apply filters to query builder
   */
  applyFilters<T>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: Record<string, any>,
    alias: string,
    allowedFilters: string[],
  ): void {
    for (const [key, value] of Object.entries(filters)) {
      if (!allowedFilters.includes(key)) continue;
      if (value === undefined || value === null || value === '') continue;

      queryBuilder.andWhere(`${alias}.${key} = :${key}`, { [key]: value });
    }
  }

  /**
   * Build pagination metadata
   */
  buildMetadata(
    total: number,
    page: number,
    limit: number,
  ): PaginationMetadata {
    return {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Execute paginated query and return formatted result
   */
  async executePaginatedQuery<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number,
  ): Promise<{ data: T[]; metadata: PaginationMetadata }> {
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      metadata: this.buildMetadata(total, page, limit),
    };
  }
}
