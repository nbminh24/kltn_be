import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, Headers, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MergeSessionDto } from './dto/merge-session.dto';
import { HandoffRequestDto } from './dto/handoff-request.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('🤖 Chatbot & Support')
@Controller('api/v1/chat')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    @Post('session')
    @Public()
    @ApiOperation({
        summary: 'Tạo hoặc lấy phiên chat',
        description: 'Tạo session mới cho guest (visitor_id) hoặc lấy session của customer đã login. JWT token tự động extract customer_id.',
    })
    @ApiResponse({ status: 201, description: 'Session được tạo hoặc lấy thành công' })
    createSession(
        @Body() dto: CreateSessionDto,
        @Headers('authorization') authHeader?: string
    ) {
        return this.chatService.createOrGetSession(dto, authHeader, undefined);
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
        description: 'Lấy danh sách chat sessions grouped by time. JWT token tự động extract customer_id.',
    })
    @ApiQuery({ name: 'customer_id', required: false, type: Number, description: 'Optional - extracted from JWT if not provided' })
    @ApiQuery({ name: 'visitor_id', required: false, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
    @ApiResponse({ status: 200, description: 'Danh sách sessions grouped by time' })
    getSessionsHistory(
        @Query() query: any,
        @Headers('authorization') authHeader?: string
    ) {
        return this.chatService.getSessionsHistory(query, authHeader);
    }

    @Get('sessions/active')
    @Public()
    @ApiOperation({
        summary: '[Chatbot UI] Lấy active session',
        description: 'Lấy session đang active. JWT token tự động extract customer_id.',
    })
    @ApiQuery({ name: 'customer_id', required: false, type: Number, description: 'Optional - extracted from JWT if not provided' })
    @ApiQuery({ name: 'visitor_id', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Active session' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy session' })
    getActiveSession(
        @Query() query: any,
        @Headers('authorization') authHeader?: string
    ) {
        return this.chatService.getActiveSession(query, authHeader);
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

    @Post('handoff')
    @Public()
    @ApiOperation({
        summary: '[Human Handoff] Request human agent',
        description: 'Transfer conversation from bot to human support agent. Bot will stop responding.',
    })
    @ApiResponse({ status: 201, description: 'Handoff request created' })
    @ApiResponse({ status: 400, description: 'Conversation already in human mode' })
    requestHandoff(@Body() dto: HandoffRequestDto) {
        return this.chatService.requestHandoff(dto.session_id, dto.reason);
    }

    @Get('conversations/pending')
    @Public()
    @ApiOperation({
        summary: '[Admin Dashboard] Get pending handoff requests',
        description: 'List all conversations waiting for admin to accept',
    })
    @ApiResponse({ status: 200, description: 'List of pending conversations' })
    getPendingConversations() {
        return this.chatService.getPendingConversations();
    }

    @Post('conversations/:id/accept')
    @Public()
    @ApiOperation({
        summary: '[Admin Dashboard] Accept conversation',
        description: 'Admin accepts and becomes assigned to conversation',
    })
    @ApiQuery({ name: 'admin_id', required: true, type: Number })
    @ApiResponse({ status: 200, description: 'Conversation accepted' })
    @ApiResponse({ status: 400, description: 'Cannot accept this conversation' })
    acceptConversation(
        @Param('id', ParseIntPipe) sessionId: number,
        @Query('admin_id', ParseIntPipe) adminId: number,
    ) {
        return this.chatService.acceptConversation(sessionId, adminId);
    }

    @Post('conversations/:id/close')
    @Public()
    @ApiOperation({
        summary: '[Admin Dashboard] Close conversation',
        description: 'Admin closes conversation after resolving issue',
    })
    @ApiQuery({ name: 'admin_id', required: true, type: Number })
    @ApiResponse({ status: 200, description: 'Conversation closed' })
    @ApiResponse({ status: 400, description: 'Not authorized to close this conversation' })
    closeConversation(
        @Param('id', ParseIntPipe) sessionId: number,
        @Query('admin_id', ParseIntPipe) adminId: number,
    ) {
        return this.chatService.closeConversation(sessionId, adminId);
    }

    @Get('conversations/admin/:adminId')
    @Public()
    @ApiOperation({
        summary: '[Admin Dashboard] Get admin active conversations',
        description: 'List all active conversations assigned to specific admin',
    })
    @ApiResponse({ status: 200, description: 'List of admin conversations' })
    getAdminConversations(@Param('adminId', ParseIntPipe) adminId: number) {
        return this.chatService.getAdminConversations(adminId);
    }

    @Post('conversations/:id/admin-message')
    @Public()
    @ApiOperation({
        summary: '[Admin Dashboard] Send admin message',
        description: 'Admin sends message to customer in active conversation',
    })
    @ApiQuery({ name: 'admin_id', required: true, type: Number })
    @ApiResponse({ status: 201, description: 'Message sent' })
    @ApiResponse({ status: 400, description: 'Not authorized or conversation not active' })
    sendAdminMessage(
        @Param('id', ParseIntPipe) sessionId: number,
        @Query('admin_id', ParseIntPipe) adminId: number,
        @Body() body: { message: string },
    ) {
        return this.chatService.sendAdminMessage(sessionId, adminId, body.message);
    }

    @Post('search-by-image')
    @Public()
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: '[Image Search] Tìm sản phẩm tương tự qua hình ảnh',
        description: 'Upload ảnh để tìm các sản phẩm thời trang tương đồng. Trả về top 10 sản phẩm có độ tương đồng cao nhất.',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách sản phẩm tương tự kèm similarity score'
    })
    @ApiResponse({ status: 400, description: 'No image provided' })
    @ApiResponse({ status: 503, description: 'Image Search Service unavailable' })
    async searchByImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No image file provided');
        }

        const products = await this.chatService.searchProductsByImage(
            file.buffer,
            file.originalname
        );

        return {
            success: true,
            total: products.length,
            products: products,
        };
    }

    @Post('search-by-image/rasa')
    @Public()
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: '[Rasa Integration] Image search với Rasa carousel format',
        description: 'Endpoint cho Rasa custom action. Upload ảnh và nhận response dạng Rasa carousel để hiển thị cho user.',
    })
    @ApiResponse({
        status: 200,
        description: 'Rasa carousel format response',
        schema: {
            type: 'object',
            properties: {
                text: { type: 'string' },
                custom: { type: 'object' },
                attachment: { type: 'object' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'No image provided' })
    async searchByImageForRasa(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No image file provided');
        }

        const products = await this.chatService.searchProductsByImage(
            file.buffer,
            file.originalname
        );

        return this.chatService.formatAsRasaCarousel(products);
    }

    @Post('upload-image')
    @Public()
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Upload ảnh lên Cloudinary',
        description: 'Upload ảnh cho image search trong chat',
    })
    @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
    @ApiResponse({ status: 400, description: 'No file provided' })
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const result = await this.cloudinaryService.uploadImage(
            file.buffer,
            file.originalname
        );

        return {
            url: result.url,
            filename: file.originalname,
            size: file.size,
        };
    }
}
