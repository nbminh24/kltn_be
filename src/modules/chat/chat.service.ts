import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MergeSessionDto } from './dto/merge-session.dto';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepository: Repository<ChatSession>,
        @InjectRepository(ChatMessage)
        private messageRepository: Repository<ChatMessage>,
        private httpService: HttpService,
        private configService: ConfigService,
    ) { }

    async createOrGetSession(dto: CreateSessionDto, customerId?: number) {
        // If user is logged in, find existing session by customer_id
        if (customerId) {
            let session = await this.sessionRepository.findOne({
                where: { customer_id: customerId },
                order: { updated_at: 'DESC' },
            });

            if (!session) {
                session = this.sessionRepository.create({
                    customer_id: customerId,
                    visitor_id: null,
                });
                await this.sessionRepository.save(session);
            }

            return {
                session_id: session.id,
                customer_id: session.customer_id,
                visitor_id: session.visitor_id,
                created_at: session.created_at,
            };
        }

        // If visitor_id provided, find existing session
        if (dto.visitor_id) {
            let session = await this.sessionRepository.findOne({
                where: { visitor_id: dto.visitor_id },
                order: { updated_at: 'DESC' },
            });

            if (!session) {
                session = this.sessionRepository.create({
                    customer_id: null,
                    visitor_id: dto.visitor_id,
                });
                await this.sessionRepository.save(session);
            }

            return {
                session_id: session.id,
                customer_id: session.customer_id,
                visitor_id: session.visitor_id,
                created_at: session.created_at,
            };
        }

        throw new BadRequestException('Phải cung cấp visitor_id hoặc đăng nhập');
    }

    async getHistory(sessionId: number, limit: number = 50, offset: number = 0) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['customer'],
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy phiên chat');
        }

        const [messages, total] = await this.messageRepository.findAndCount({
            where: { session_id: sessionId },
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });

        return {
            session: {
                id: session.id,
                customer_id: session.customer_id,
                visitor_id: session.visitor_id,
                customer: session.customer ? {
                    id: session.customer.id,
                    name: session.customer.name,
                    email: session.customer.email,
                } : null,
            },
            messages: messages.reverse(), // Reverse để hiển thị từ cũ đến mới
            total,
            limit,
            offset,
        };
    }

    async sendMessage(dto: SendMessageDto) {
        const session = await this.sessionRepository.findOne({
            where: { id: dto.session_id },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy phiên chat');
        }

        // 1. Save user message
        const userMessage = this.messageRepository.create({
            session_id: dto.session_id,
            sender: 'customer',
            message: dto.message,
            is_read: false,
        });
        await this.messageRepository.save(userMessage);

        // 2. Call Rasa Server
        const rasaUrl = this.configService.get<string>('RASA_SERVER_URL');
        let botResponses = [];

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${rasaUrl}/webhooks/rest/webhook`, {
                    sender: session.visitor_id || `customer_${session.customer_id}`,
                    message: dto.message,
                }),
            );

            botResponses = response.data || [];
        } catch (error) {
            // If Rasa is down, return fallback message
            botResponses = [{
                text: 'Xin lỗi, chatbot hiện không khả dụng. Vui lòng thử lại sau hoặc liên hệ admin.',
            }];
        }

        // 3. Save bot messages
        const savedBotMessages = [];
        for (const botMsg of botResponses) {
            const botMessage = this.messageRepository.create({
                session_id: dto.session_id,
                sender: 'bot',
                message: botMsg.text || '',
                is_read: false,
            });
            const saved = await this.messageRepository.save(botMessage);
            savedBotMessages.push(saved);
        }

        // 4. Update session timestamp
        session.updated_at = new Date();
        await this.sessionRepository.save(session);

        return {
            user_message: userMessage,
            bot_messages: savedBotMessages,
            session_id: dto.session_id,
        };
    }

    async mergeSessions(dto: MergeSessionDto, customerId: number) {
        if (!customerId) {
            throw new BadRequestException('Người dùng chưa đăng nhập');
        }

        // Find all sessions with this visitor_id
        const visitorSessions = await this.sessionRepository.find({
            where: { visitor_id: dto.visitor_id },
        });

        if (visitorSessions.length === 0) {
            return {
                message: 'Không tìm thấy phiên chat nào để merge',
                merged_count: 0,
            };
        }

        // Update all visitor sessions to belong to customer
        await this.sessionRepository.update(
            { visitor_id: dto.visitor_id },
            { customer_id: customerId, visitor_id: null },
        );

        return {
            message: 'Merge phiên chat thành công',
            merged_count: visitorSessions.length,
            customer_id: customerId,
        };
    }

    async getSessionsHistory(query: any) {
        const { customer_id, visitor_id, page = 1, limit = 50 } = query;

        if (!customer_id && !visitor_id) {
            throw new BadRequestException('Phải cung cấp customer_id hoặc visitor_id');
        }

        const where: any = { status: 'active' };
        if (customer_id) {
            where.customer_id = parseInt(customer_id);
        } else if (visitor_id) {
            where.visitor_id = visitor_id;
        }

        const [sessions, total] = await this.sessionRepository.findAndCount({
            where,
            order: { updated_at: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
        });

        // Group sessions by time
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const grouped = {
            today: [],
            yesterday: [],
            last_7_days: [],
            older: [],
        };

        for (const session of sessions) {
            const sessionDate = new Date(session.updated_at);

            if (sessionDate >= today) {
                grouped.today.push(session);
            } else if (sessionDate >= yesterday) {
                grouped.yesterday.push(session);
            } else if (sessionDate >= sevenDaysAgo) {
                grouped.last_7_days.push(session);
            } else {
                grouped.older.push(session);
            }
        }

        return {
            sessions: grouped,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    async getActiveSession(query: any) {
        const { customer_id, visitor_id } = query;

        if (!customer_id && !visitor_id) {
            throw new BadRequestException('Phải cung cấp customer_id hoặc visitor_id');
        }

        const where: any = { status: 'active' };
        if (customer_id) {
            where.customer_id = parseInt(customer_id);
        } else if (visitor_id) {
            where.visitor_id = visitor_id;
        }

        const session = await this.sessionRepository.findOne({
            where,
            order: { updated_at: 'DESC' },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy session active');
        }

        return {
            session_id: session.id,
            customer_id: session.customer_id,
            visitor_id: session.visitor_id,
            status: session.status,
            created_at: session.created_at,
            updated_at: session.updated_at,
        };
    }

    async deleteSession(sessionId: number) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy session');
        }

        // Delete all messages first
        await this.messageRepository.delete({ session_id: sessionId });

        // Delete session
        await this.sessionRepository.delete({ id: sessionId });

        return {
            message: 'Xóa session thành công',
            session_id: sessionId,
        };
    }

    async uploadImage(file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Không tìm thấy file');
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException('File quá lớn (tối đa 5MB)');
        }

        // TODO: Upload to cloud storage (S3, Cloudinary, etc.)
        // For now, return a placeholder URL
        const imageUrl = `https://placeholder.com/chat/${Date.now()}-${file.originalname}`;

        return {
            url: imageUrl,
            filename: file.originalname,
            size: file.size,
        };
    }

    async markAsRead(messageId: number) {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
        });

        if (!message) {
            throw new NotFoundException('Không tìm thấy tin nhắn');
        }

        message.is_read = true;
        await this.messageRepository.save(message);

        return {
            message: 'Đánh dấu đã đọc thành công',
            message_id: messageId,
        };
    }
}
