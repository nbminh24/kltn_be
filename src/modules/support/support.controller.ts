import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Public } from '../../common/decorators/public.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('Support')
@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/tickets')
  @Public()
  @ApiOperation({ 
    summary: 'Gửi yêu cầu hỗ trợ',
    description: 'Tạo ticket hỗ trợ khách hàng với thông tin liên hệ, tiêu đề, nội dung và mức độ ưu tiên. AI chatbot sẽ thử giải quyết tự động.'
  })
  @ApiResponse({ status: 201, description: 'Ticket được tạo thành công' })
  createTicket(@Body() body: CreateTicketDto) {
    return this.supportService.createTicket(body);
  }

  @Get('pages/:slug')
  @Public()
  @ApiOperation({ 
    summary: 'Lấy nội dung trang tĩnh',
    description: 'Lấy nội dung của các trang tĩnh như: About Us, FAQ, Terms & Conditions, Privacy Policy. DỮf liệu được quản lý bởi Admin.'
  })
  @ApiResponse({ status: 200, description: 'Nội dung trang' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  getPage(@Param('slug') slug: string) {
    return this.supportService.getPage(slug);
  }
}
