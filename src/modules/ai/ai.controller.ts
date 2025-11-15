import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class ChatbotRequestDto {
  message: string;
  session_id: string;
}

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chatbot')
  @Public()
  @ApiTags('AI - Chatbot')
  @ApiOperation({
    summary: 'Chatbot AI (Proxy đến Rasa Server)',
    description: 'Gửi tin nhắn đến Rasa chatbot. API này hoạt động như proxy.',
  })
  @ApiResponse({ status: 200, description: 'Nhận được phản hồi từ chatbot' })
  async chatbot(@Body() body: ChatbotRequestDto, @CurrentUser() user?: any) {
    return this.aiService.chatbot(body.message, body.session_id, user?.userId);
  }

  @Post('search/image')
  @Public()
  @ApiTags('AI - Image Search')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tìm kiếm sản phẩm bằng ảnh (FastAPI + pgvector)',
    description:
      'Upload ảnh để tìm sản phẩm tương tự. Sử dụng FastAPI để encode ảnh thành vector và pgvector để tìm kiếm.',
  })
  @ApiResponse({ status: 200, description: 'Tìm kiếm thành công' })
  async searchByImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        message: 'No image file provided',
        results: [],
        count: 0,
      };
    }

    return this.aiService.searchByImage(file);
  }
}
