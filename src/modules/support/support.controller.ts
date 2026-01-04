import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('🤖 Chatbot & Support')
@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/tickets')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '[Chatbot Fallback] Gửi yêu cầu hỗ trợ',
    description:
      'Khách hàng gửi form liên hệ/hỗ trợ. Tạo ticket mới với status=pending và source=contact_form. Nếu đã đăng nhập, tự động lấy email và customer_id từ account. Guest user cần nhập email.',
  })
  @ApiResponse({
    status: 201,
    description: 'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi sớm nhất.',
  })
  createTicket(@CurrentUser() user: any, @Body() body: CreateTicketDto) {
    const customerId = user?.sub || null;
    console.log('🎫 Support Ticket - Customer ID:', customerId);
    return this.supportService.createTicket(body, customerId);
  }

  @Get('customers/me/tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Chatbot] Danh sách tickets của khách hàng',
    description: 'Lấy danh sách tickets (support requests) của customer đã đăng nhập.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter: pending | in_progress | resolved | closed',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sách tickets' })
  getMyTickets(@CurrentUser() user: any, @Query() query: any) {
    return this.supportService.getMyTickets(user.sub, query);
  }

  @Get('tickets/:id')
  @Public()
  @ApiOperation({
    summary: '[Chatbot] Chi tiết ticket',
    description:
      'Lấy thông tin chi tiết ticket và các reply (conversation giữa customer và admin).',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết ticket' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
  getTicket(@Param('id') id: string) {
    return this.supportService.getTicket(parseInt(id));
  }

  @Post('tickets/:id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Chatbot] Customer trả lời ticket',
    description: 'Customer reply lại ticket. Tự động set status = in_progress nếu đang pending.',
  })
  @ApiResponse({ status: 201, description: 'Trả lời thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
  replyTicket(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.supportService.replyTicket(parseInt(id), user.sub, body.message);
  }

  @Get('pages/:slug')
  @Public()
  @ApiOperation({
    summary: 'Lấy nội dung trang tĩnh',
    description:
      'Lấy nội dung của các trang tĩnh như: About Us, FAQ, Terms & Conditions, Privacy Policy. Dữ liệu được quản lý bởi Admin.',
  })
  @ApiResponse({ status: 200, description: 'Nội dung trang' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  getPage(@Param('slug') slug: string) {
    return this.supportService.getPage(slug);
  }
}
