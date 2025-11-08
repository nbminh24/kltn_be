import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { StaticPage } from '../../entities/static-page.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { ProductImage } from '../../entities/product-image.entity';
import { Promotion } from '../../entities/promotion.entity';
import { ChatbotConversation } from '../../entities/chatbot-conversation.entity';
import { ChatbotMessage } from '../../entities/chatbot-message.entity';
import { AiRecommendation } from '../../entities/ai-recommendation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      Order,
      User,
      SupportTicket,
      StaticPage,
      ProductVariant,
      ProductImage,
      Promotion,
      ChatbotConversation,
      ChatbotMessage,
      AiRecommendation,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
