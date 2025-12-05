import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { SupportTicketReply } from '../../entities/support-ticket-reply.entity';
import { Customer } from '../../entities/customer.entity';
import { Page } from '../../entities/page.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportTicketReply)
    private replyRepository: Repository<SupportTicketReply>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
  ) { }

  async createTicket(data: any, customerId?: number) {
    console.log('📋 CreateTicket - customerId from token:', customerId);
    console.log('📋 CreateTicket - customer_email from body:', data.customer_email);

    let customer_email = data.customer_email;
    let customer_id = customerId || null;

    // If authenticated, fetch customer info
    if (customerId) {
      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (customer) {
        customer_id = customer.id;
        customer_email = customer.email;
        console.log('✅ Authenticated user - email auto-filled:', customer_email);
      } else {
        console.log('⚠️ Customer ID from token not found in database:', customerId);
      }
    }

    // For guest users, require email
    if (!customer_email) {
      console.log('❌ No email available - guest user must provide email');
      throw new BadRequestException('Email là bắt buộc đối với khách vãng lai');
    }

    // Generate unique ticket code
    const ticket_code = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const ticket = this.ticketRepository.create({
      ticket_code,
      customer_id,
      customer_email,
      subject: data.subject,
      message: data.message,
      source: 'contact_form',
      status: 'pending',
    });

    await this.ticketRepository.save(ticket);

    return {
      message: 'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi sớm nhất qua email.',
      ticket_code: ticket.ticket_code,
      ticket_id: ticket.id,
    };
  }

  async getPage(slug: string) {
    const page = await this.pageRepository.findOne({
      where: { slug, status: 'Published' },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return { page };
  }

  async getMyTickets(customerId: number, query: any) {
    const { status, page = 1, limit = 10 } = query;

    const where: any = { customer_id: customerId };
    if (status) {
      where.status = status;
    }

    const [tickets, total] = await this.ticketRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicket(ticketId: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['customer'],
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy ticket');
    }

    // Get replies
    const replies = await this.replyRepository.find({
      where: { ticket_id: ticketId },
      order: { created_at: 'ASC' },
    });

    return {
      ticket: {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority,
        source: ticket.source,
        created_at: ticket.created_at,
        customer: ticket.customer ? {
          id: ticket.customer.id,
          name: ticket.customer.name,
          email: ticket.customer.email,
        } : null,
      },
      replies,
    };
  }

  async replyTicket(ticketId: number, customerId: number, message: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy ticket');
    }

    // Check if customer owns this ticket
    if (ticket.customer_id !== customerId) {
      throw new ForbiddenException('Bạn không có quyền trả lời ticket này');
    }

    // Create reply
    const reply = this.replyRepository.create({
      ticket_id: ticketId,
      admin_id: null, // Customer reply
      body: message,
    });
    await this.replyRepository.save(reply);

    // Update ticket status to in_progress if pending
    if (ticket.status === 'pending') {
      ticket.status = 'in_progress';
      await this.ticketRepository.save(ticket);
    }

    return {
      message: 'Trả lời thành công',
      reply,
    };
  }
}
