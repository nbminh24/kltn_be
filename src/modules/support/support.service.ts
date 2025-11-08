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
    const ticket = this.ticketRepository.create({
      id: IdGenerator.generate('ticket'),
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      subject: data.subject,
      message: data.message,
      priority: data.priority || 'medium',
    });

    await this.ticketRepository.save(ticket);
    return { message: 'Support ticket created', ticket };
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
