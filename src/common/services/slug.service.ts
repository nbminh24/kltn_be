import { Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  /**
   * Chuyển đổi chuỗi thành slug
   * Ví dụ: "Áo Hoodie & Jacket" → "ao-hoodie-jacket"
   */
  generateSlug(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .normalize('NFD') // Chuẩn hóa Unicode
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/đ/g, 'd') // Đặc biệt cho chữ đ
      .replace(/Đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // Chỉ giữ chữ, số, space, dấu gạch ngang
      .trim()
      .replace(/\s+/g, '-') // Thay space bằng dấu gạch ngang
      .replace(/-+/g, '-'); // Loại bỏ dấu gạch ngang liên tiếp
  }

  /**
   * Tạo slug unique bằng cách thêm số vào cuối nếu trùng
   * @param baseSlug Slug gốc
   * @param checkExistsFn Function kiểm tra slug đã tồn tại chưa
   * @returns Slug unique
   */
  async makeUniqueSlug(
    baseSlug: string,
    checkExistsFn: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    // Kiểm tra slug có tồn tại không
    while (await checkExistsFn(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Generate slug từ text và đảm bảo unique
   * @param text Text cần tạo slug
   * @param checkExistsFn Function kiểm tra slug đã tồn tại
   * @param excludeId ID cần loại trừ (khi update)
   * @returns Slug unique
   */
  async generateUniqueSlug(
    text: string,
    checkExistsFn: (slug: string, excludeId?: number) => Promise<boolean>,
    excludeId?: number,
  ): Promise<string> {
    const baseSlug = this.generateSlug(text);
    
    // Tạo wrapper function để truyền excludeId
    const checkFn = async (slug: string) => {
      return await checkExistsFn(slug, excludeId);
    };

    return await this.makeUniqueSlug(baseSlug, checkFn);
  }
}
