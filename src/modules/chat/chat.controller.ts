import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MergeSessionDto } from './dto/merge-session.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('🤖 Chatbot & Support')
@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('session')
    @Public()
    @ApiOperation({
        summary: 'Tạo hoặc lấy phiên chat',
        description: 'Tạo session mới cho guest (visitor_id) hoặc lấy session của customer đã login',
    })
    @ApiResponse({ status: 201, description: 'Session được tạo hoặc lấy thành công' })
    createSession(
        @Body() dto: CreateSessionDto,
        @Headers('authorization') authHeader?: string,
        @CurrentUser() user?: any
    ) {
        const customerId = user?.customerId ? parseInt(user.customerId) : undefined;
        return this.chatService.createOrGetSession(dto, authHeader, customerId);
    }

    @Get('history')
    @Public()
    @ApiOperation({
        summary: 'Lấy lịch sử chat',
        description: 'Lấy tất cả tin nhắn trong một phiên chat',
    })
    @ApiQuery({ name: 'session_id', required: true, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiResponse({ status: 200, description: 'Lịch sử chat' })
    getHistory(
        @Query('session_id', ParseIntPipe) sessionId: number,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.chatService.getHistory(
            sessionId,
            limit ? parseInt(limit.toString()) : 50,
            offset ? parseInt(offset.toString()) : 0,
        );
    }

    @Post('send')
    @Public()
    @ApiOperation({
        summary: 'Gửi tin nhắn',
        description: 'Gửi tin nhắn từ user và nhận phản hồi từ Rasa bot',
    })
    @ApiResponse({ status: 201, description: 'Tin nhắn đã gửi và nhận phản hồi' })
    sendMessage(
        @Body() dto: SendMessageDto,
        @Headers('authorization') authHeader?: string
    ) {
        return this.chatService.sendMessage(dto, authHeader);
    }

    @Put('merge')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Merge phiên chat visitor sang customer',
        description: 'Gọi sau khi user login để gộp chat history từ visitor_id vào tài khoản',
    })
    @ApiResponse({ status: 200, description: 'Merge thành công' })
    mergeSessions(@Body() dto: MergeSessionDto, @CurrentUser() user: any) {
        const customerId = user?.customerId ? parseInt(user.customerId) : null;
        return this.chatService.mergeSessions(dto, customerId);
    }

    @Get('sessions/history')
    @Public()
    @ApiOperation({
        summary: '[Chatbot UI] Lấy lịch sử chat sessions',
        description: 'Lấy danh sách chat sessions grouped by time (Hôm nay, Hôm qua, 7 ngày trước...). Dùng cho sidebar ChatGPT-style.',
    })
    @ApiQuery({ name: 'customer_id', required: false, type: Number })
    @ApiQuery({ name: 'visitor_id', required: false, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
    @ApiResponse({ status: 200, description: 'Danh sách sessions grouped by time' })
    getSessionsHistory(@Query() query: any) {
        return this.chatService.getSessionsHistory(query);
    }

    @Get('sessions/active')
    @Public()
    @ApiOperation({
        summary: '[Chatbot UI] Lấy active session',
        description: 'Lấy session đang active của customer hoặc visitor. Dùng cho popup bubble chat.',
    })
    @ApiQuery({ name: 'customer_id', required: false, type: Number })
    @ApiQuery({ name: 'visitor_id', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Active session' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy session' })
    getActiveSession(@Query() query: any) {
        return this.chatService.getActiveSession(query);
    }

    @Delete('sessions/:id')
    @Public()
    @ApiOperation({
        summary: '[Chatbot UI] Xóa chat session',
        description: 'Xóa một conversation trong sidebar. Xóa cả messages liên quan.',
    })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy session' })
    deleteSession(@Param('id', ParseIntPipe) id: number) {
        return this.chatService.deleteSession(id);
    }

    @Post('upload-image')
    @Public()
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: '[Chatbot UI] Upload ảnh trong chat',
        description: 'Upload ảnh và trả về URL. Frontend sẽ gửi URL này kèm message.',
    })
    @ApiResponse({ status: 201, description: 'Upload thành công' })
    @ApiResponse({ status: 400, description: 'File không hợp lệ' })
    uploadImage(@UploadedFile() file: Express.Multer.File) {
        return this.chatService.uploadImage(file);
    }

    @Put('messages/:id/read')
    @Public()
    @ApiOperation({
        summary: '[Chatbot UI] Đánh dấu tin nhắn đã đọc',
        description: 'Đánh dấu một hoặc nhiều tin nhắn đã đọc (Optional - có thể bỏ)',
    })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    markAsRead(@Param('id', ParseIntPipe) id: number) {
        return this.chatService.markAsRead(id);
    }
}
