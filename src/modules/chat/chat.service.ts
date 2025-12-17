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
                    status: 'bot',
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
                    status: 'bot',
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
                    status: 'bot',
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
                status: session.status,
                assigned_admin_id: session.assigned_admin_id,
                handoff_requested_at: session.handoff_requested_at,
                handoff_accepted_at: session.handoff_accepted_at,
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

        // ❗ CRITICAL: Skip Rasa if conversation is in human mode
        if (session.status === 'human_pending' || session.status === 'human_active') {
            this.logger.log(`🚫 Skipping Rasa for session ${session.id} - status: ${session.status}`);

            // Update session timestamp
            session.updated_at = new Date();
            await this.sessionRepository.save(session);

            // If pending, send waiting message
            if (session.status === 'human_pending') {
                const waitingMessage = this.messageRepository.create({
                    session_id: dto.session_id,
                    sender: 'bot',
                    message: 'Your request has been forwarded to our support team. They will respond during working hours (8AM-8PM).',
                    is_read: false,
                });
                const saved = await this.messageRepository.save(waitingMessage);

                return {
                    customer_message: customerMessage,
                    bot_responses: [saved],
                };
            }

            // If human_active, just save customer message (admin will respond)
            return {
                customer_message: customerMessage,
                bot_responses: [],
            };
        }

        // 2. Call Rasa Server with customer_id in metadata (only if status = 'bot')
        const rasaUrl = this.configService.get<string>('RASA_SERVER_URL') || 'http://localhost:5005';
        // Use session_id as sender to isolate Rasa conversations per session
        const senderId = session.visitor_id || `session_${dto.session_id}`;
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

        // 3. Save bot responses WITH custom data to database
        const savedBotResponses = [];
        for (const rasaMsg of rasaResponses) {
            // Save to DB including custom and buttons for persistence
            const botMessage = this.messageRepository.create({
                session_id: dto.session_id,
                sender: 'bot',
                message: rasaMsg.text || '',
                is_read: false,
                custom: rasaMsg.custom || null,    // ✅ SAVE custom to DB
                buttons: rasaMsg.buttons || null,  // ✅ SAVE buttons to DB
            });
            const saved = await this.messageRepository.save(botMessage);

            savedBotResponses.push(saved);
        }

        // 4. Update session timestamp
        // Reload session to get latest status (in case handoff was triggered)
        const latestSession = await this.sessionRepository.findOne({ where: { id: dto.session_id } });
        if (latestSession) {
            latestSession.updated_at = new Date();
            await this.sessionRepository.save(latestSession);
        }

        // Return with custom data attached
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

        const where: any = {};
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

        const where: any = {};
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
            message: 'Đã đánh dấu là đã đọc',
            message_id: messageId,
        };
    }

    /**
     * Request human handoff - transfer conversation from bot to human agent
     */
    async requestHandoff(sessionId: number, reason?: string) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.status === 'human_pending' || session.status === 'human_active') {
            throw new BadRequestException('This conversation is already assigned to or pending human agent');
        }

        // Check working hours (8AM - 8PM)
        const now = new Date();
        const hour = now.getHours();
        const isWorkingHours = hour >= 8 && hour < 20;

        // Update session status
        session.status = 'human_pending';
        session.handoff_requested_at = new Date();
        session.handoff_reason = reason || 'customer_request';
        await this.sessionRepository.save(session);

        this.logger.log(` Handoff requested for session ${sessionId}. Working hours: ${isWorkingHours}`);

        // Send bot confirmation message
        const botMessage = this.messageRepository.create({
            session_id: sessionId,
            sender: 'bot',
            message: isWorkingHours
                ? "I'm inviting one of our human support agents to assist you. They will respond shortly. This conversation will now be handled by a human agent."
                : "I've forwarded your request to our support team. Our agents are available from 8:00 AM to 8:00 PM. They will respond during working hours.",
            is_read: false,
        });
        await this.messageRepository.save(botMessage);

        return {
            success: true,
            message: 'Handoff request created',
            session: {
                id: session.id,
                status: session.status,
                handoff_requested_at: session.handoff_requested_at,
                working_hours: isWorkingHours,
            },
        };
    }

    /**
     * Admin accepts conversation - assigns admin to conversation
     */
    async acceptConversation(sessionId: number, adminId: number) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.status !== 'human_pending') {
            throw new BadRequestException(`Cannot accept conversation with status: ${session.status}`);
        }

        // Assign admin and activate
        session.status = 'human_active';
        session.assigned_admin_id = adminId;
        session.handoff_accepted_at = new Date();
        await this.sessionRepository.save(session);

        this.logger.log(` Admin ${adminId} accepted conversation ${sessionId}`);

        // Send system message
        const systemMessage = this.messageRepository.create({
            session_id: sessionId,
            sender: 'admin',
            message: 'Hello! I\'m here to help you. How can I assist you today?',
            is_read: false,
        });
        await this.messageRepository.save(systemMessage);

        return {
            success: true,
            message: 'Conversation accepted',
            session: {
                id: session.id,
                status: session.status,
                assigned_admin_id: session.assigned_admin_id,
                handoff_accepted_at: session.handoff_accepted_at,
            },
        };
    }

    /**
     * Close conversation - end human conversation
     */
    async closeConversation(sessionId: number, adminId: number) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (Number(session.assigned_admin_id) !== Number(adminId)) {
            throw new BadRequestException('You are not assigned to this conversation');
        }

        session.status = 'closed';
        await this.sessionRepository.save(session);

        this.logger.log(` Conversation ${sessionId} closed by admin ${adminId}`);

        // Send closing message
        const closingMessage = this.messageRepository.create({
            session_id: sessionId,
            sender: 'admin',
            message: 'This conversation has been closed. If you need further assistance, please start a new conversation.',
            is_read: false,
        });
        await this.messageRepository.save(closingMessage);

        return {
            success: true,
            message: 'Conversation closed',
            session_id: sessionId,
        };
    }

    /**
     * Get pending conversations for admin dashboard
     */
    async getPendingConversations() {
        const sessions = await this.sessionRepository.find({
            where: { status: 'human_pending' },
            relations: ['customer'],
            order: { handoff_requested_at: 'ASC' },
        });

        return {
            total: sessions.length,
            conversations: sessions.map(s => ({
                session_id: s.id,
                customer: s.customer ? {
                    id: s.customer.id,
                    name: s.customer.name,
                    email: s.customer.email,
                } : null,
                visitor_id: s.visitor_id,
                handoff_reason: s.handoff_reason,
                handoff_requested_at: s.handoff_requested_at,
                created_at: s.created_at,
            })),
        };
    }

    /**
     * Get active conversations assigned to admin
     */
    async getAdminConversations(adminId: number) {
        const sessions = await this.sessionRepository.find({
            where: {
                assigned_admin_id: adminId,
                status: 'human_active',
            },
            relations: ['customer'],
            order: { updated_at: 'DESC' },
        });

        return {
            total: sessions.length,
            conversations: sessions.map(s => ({
                session_id: s.id,
                customer: s.customer ? {
                    id: s.customer.id,
                    name: s.customer.name,
                    email: s.customer.email,
                } : null,
                visitor_id: s.visitor_id,
                handoff_reason: s.handoff_reason,
                handoff_accepted_at: s.handoff_accepted_at,
                updated_at: s.updated_at,
            })),
        };
    }

    /**
     * Send admin message to customer
     */
    async sendAdminMessage(sessionId: number, adminId: number, message: string) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (Number(session.assigned_admin_id) !== Number(adminId)) {
            throw new BadRequestException('You are not assigned to this conversation');
        }

        if (session.status !== 'human_active') {
            throw new BadRequestException('Conversation is not active');
        }

        // Save admin message
        const adminMessage = this.messageRepository.create({
            session_id: sessionId,
            sender: 'admin',
            message: message,
            is_read: false,
        });
        await this.messageRepository.save(adminMessage);

        // Update session timestamp
        session.updated_at = new Date();
        await this.sessionRepository.save(session);

        return {
            success: true,
            message: adminMessage,
        };
    }
}
