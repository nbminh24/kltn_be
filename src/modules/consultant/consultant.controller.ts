import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ConsultantService } from './consultant.service';
import { StylingAdviceDto } from './dto/styling-advice.dto';
import { SizingAdviceDto } from './dto/sizing-advice.dto';
import { CompareProductsDto } from './dto/compare-products.dto';

@ApiTags('Consultant (Chatbot)')
@Controller('consultant')
@Public()
export class ConsultantController {
  constructor(private readonly consultantService: ConsultantService) {}

  @Post('styling')
  @ApiOperation({
    summary: '[Chatbot] Tư vấn phối đồ',
    description:
      'Gợi ý 2-3 sản phẩm phù hợp với dịp và phong cách. Dùng cho intent: ask_styling_advice',
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm gợi ý phối đồ' })
  getStylingAdvice(@Body() dto: StylingAdviceDto) {
    return this.consultantService.getStylingAdvice(dto);
  }

  @Post('sizing')
  @ApiOperation({
    summary: '[Chatbot] Tư vấn kích cỡ',
    description:
      'Tính toán size phù hợp dựa trên chiều cao/cân nặng. Dùng cho intent: ask_sizing_advice',
  })
  @ApiResponse({ status: 200, description: 'Size gợi ý và tình trạng tồn kho' })
  getSizingAdvice(@Body() dto: SizingAdviceDto) {
    return this.consultantService.getSizingAdvice(dto);
  }

  @Post('compare')
  @ApiOperation({
    summary: '[Chatbot] So sánh sản phẩm',
    description:
      'So sánh 2-3 sản phẩm về giá, chất liệu, rating. Dùng cho intent: ask_product_comparison_contextual',
  })
  @ApiResponse({ status: 200, description: 'Bảng so sánh sản phẩm' })
  compareProducts(@Body() dto: CompareProductsDto) {
    return this.consultantService.compareProducts(dto);
  }
}
