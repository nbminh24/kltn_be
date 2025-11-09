import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { StaticPage } from '../../entities/static-page.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(StaticPage)
    private pageRepository: Repository<StaticPage>,
  ) {}

  async createTicket(data: any) {
    // Generate unique ticket code
    const ticket_code = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const ticket = this.ticketRepository.create({
      ticket_code,
      customer_id: data.customer_id || null,
      customer_email: data.customer_email,
      subject: data.subject,
      source: 'contact_form',
      status: 'pending',
    });

    await this.ticketRepository.save(ticket);
    
    return { 
      message: 'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi sớm nhất qua email.', 
      ticket_code: ticket.ticket_code,
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
}
