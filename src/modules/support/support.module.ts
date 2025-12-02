import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { SupportTicketReply } from '../../entities/support-ticket-reply.entity';
import { Page } from '../../entities/page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, SupportTicketReply, Page])],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule { }
