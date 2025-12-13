import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MergeSessionDto } from './dto/merge-session.dto';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        @InjectRepository(ChatSession)
        private sessionRepository: Repository<ChatSession>,
        @InjectRepository(ChatMessage)
        private messageRepository: Repository<ChatMessage>,
        private httpService: HttpService,
        private configService: ConfigService,
        private jwtService: JwtService,
    ) { }

    /**
     * Extract customer_id from JWT token if present
     */
    private extractCustomerIdFromJWT(authHeader?: string): number | undefined {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return undefined;
        }

        try {
            const token = authHeader.substring(7);
            const decoded = this.jwtService.verify(token);
            const customerId = decoded.sub || decoded.customerId;

            if (customerId) {
                this.logger.log(`✅ Extracted customer_id from JWT: ${customerId}`);
                return Number(customerId);
            }
        } catch (error) {
            this.logger.warn(`⚠️ Failed to decode JWT: ${error.message}`);
        }

        return undefined;
    }

    async createOrGetSession(dto: CreateSessionDto, authHeader?: string, customerId?: number) {
        // Try to extract customer_id from JWT if not provided
        if (!customerId && authHeader) {
            customerId = this.extractCustomerIdFromJWT(authHeader);
        }

        // If user is logged in
        if (customerId) {
            // Force create new session (ChatGPT-style new conversation)
            if (dto.force_new) {
                const session = this.sessionRepository.create({
                    customer_id: customerId,
                    visitor_id: null,
                });
                await this.sessionRepository.save(session);

                this.logger.log(`✅ Created NEW chat session for customer_id: ${customerId}, session_id: ${session.id}`);

                return {
                    session: {
                        id: session.id,
                        visitor_id: session.visitor_id,
                        customer_id: session.customer_id,
                        created_at: session.created_at,
                        updated_at: session.updated_at,
                    },
                    is_new: true,
                };
            }

            // Get existing session or create if not exists
            let session = await this.sessionRepository.findOne({
                where: { customer_id: customerId },
                order: { updated_at: 'DESC' },
            });

            const isNew = !session;

            if (!session) {
                session = this.sessionRepository.create({
                    customer_id: customerId,
                    visitor_id: null,
                });
                await this.sessionRepository.save(session);
            }

            return {
                session: {
                    id: session.id,
                    visitor_id: session.visitor_id,
                    customer_id: session.customer_id,
                    created_at: session.created_at,
                    updated_at: session.updated_at,
                },
                is_new: isNew,
            };
        }

        // If visitor_id provided, find existing session
        if (dto.visitor_id) {
            let session = await this.sessionRepository.findOne({
                where: { visitor_id: dto.visitor_id },
                order: { updated_at: 'DESC' },
            });

            const isNew = !session;

            if (!session) {
                session = this.sessionRepository.create({
                    customer_id: null,
                    visitor_id: dto.visitor_id,
                });
                await this.sessionRepository.save(session);
            }

            return {
                session: {
                    id: session.id,
                    visitor_id: session.visitor_id,
                    customer_id: session.customer_id,
                    created_at: session.created_at,
                    updated_at: session.updated_at,
                },
                is_new: isNew,
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

    async sendMessage(dto: SendMessageDto, authHeader?: string) {
        const session = await this.sessionRepository.findOne({
            where: { id: dto.session_id },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy phiên chat');
        }

        // Extract customer_id from JWT and update session if needed
        let customerId = session.customer_id;
        if (!customerId && authHeader) {
            customerId = this.extractCustomerIdFromJWT(authHeader);

            // Update session with customer_id if extracted from JWT
            if (customerId && session.customer_id !== customerId) {
                this.logger.log(`🔄 Updating session ${session.id} with customer_id: ${customerId}`);
                session.customer_id = customerId;
                await this.sessionRepository.save(session);
            }
        }

        // 1. Save user message
        const customerMessage = this.messageRepository.create({
            session_id: dto.session_id,
            sender: 'customer',
            message: dto.message,
            is_read: false,
        });
        await this.messageRepository.save(customerMessage);

        // 2. Call Rasa Server with customer_id in metadata
        const rasaUrl = this.configService.get<string>('RASA_SERVER_URL') || 'http://localhost:5005';
        const senderId = session.visitor_id || `customer_${session.customer_id}`;
        let rasaResponses = [];

        // Build metadata with customer_id
        const metadata: any = {
            session_id: dto.session_id.toString(),
        };

        if (customerId) {
            metadata.customer_id = customerId;
            this.logger.log(`✅ Injecting customer_id into Rasa metadata: ${customerId}`);
        }

        if (authHeader) {
            metadata.user_jwt_token = authHeader.replace('Bearer ', '');
        }

        console.log(`[Chat] Calling Rasa webhook: ${rasaUrl}/webhooks/rest/webhook`);
        console.log(`[Chat] Sender: ${senderId}, Message: "${dto.message}"`);
        console.log(`[Chat] Metadata:`, JSON.stringify(metadata));

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${rasaUrl}/webhooks/rest/webhook`,
                    {
                        sender: senderId,
                        message: dto.message,
                        metadata: metadata,  // ✅ Include metadata with customer_id
                    },
                    {
                        timeout: 10000, // 10 seconds timeout
                    }
                ),
            );

            rasaResponses = response.data || [];
            console.log(`[Chat] Rasa responded with ${rasaResponses.length} message(s)`);
        } catch (error) {
            // Log detailed error for debugging
            console.error('[Chat] Rasa webhook failed:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('[Chat] Rasa server is not running or unreachable');
            }

            // Fallback message when Rasa is down
            rasaResponses = [{
                text: 'Xin lỗi, chatbot hiện không khả dụng. Vui lòng thử lại sau hoặc liên hệ support.',
            }];
        }

        // 3. Save bot responses
        const savedBotResponses = [];
        for (const rasaMsg of rasaResponses) {
            const botMessage = this.messageRepository.create({
                session_id: dto.session_id,
                sender: 'bot',
                message: rasaMsg.text || '',
                is_read: false,
            });
            const saved = await this.messageRepository.save(botMessage);
            savedBotResponses.push(saved);
        }

        // 4. Update session timestamp
        session.updated_at = new Date();
        await this.sessionRepository.save(session);

        // Return with correct naming (Fix Bug #2)
        return {
            customer_message: customerMessage,
            bot_responses: savedBotResponses,
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

    async getSessionsHistory(query: any, authHeader?: string) {
        const { customer_id, visitor_id, page = 1, limit = 50 } = query;

        // Extract customer_id from JWT if not provided
        let finalCustomerId = customer_id;
        if (!finalCustomerId && authHeader) {
            finalCustomerId = this.extractCustomerIdFromJWT(authHeader);
        }

        if (!finalCustomerId && !visitor_id) {
            throw new BadRequestException('Phải cung cấp customer_id, visitor_id hoặc JWT token');
        }

        const where: any = { status: 'active' };
        if (finalCustomerId) {
            where.customer_id = parseInt(finalCustomerId);
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

    async getActiveSession(query: any, authHeader?: string) {
        const { customer_id, visitor_id } = query;

        // Extract customer_id from JWT if not provided
        let finalCustomerId = customer_id;
        if (!finalCustomerId && authHeader) {
            finalCustomerId = this.extractCustomerIdFromJWT(authHeader);
        }

        if (!finalCustomerId && !visitor_id) {
            throw new BadRequestException('Phải cung cấp customer_id, visitor_id hoặc JWT token');
        }

        const where: any = { status: 'active' };
        if (finalCustomerId) {
            where.customer_id = parseInt(finalCustomerId);
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
