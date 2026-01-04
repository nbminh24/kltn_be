import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ProductImage } from '../../entities/product-image.entity';
import { Product } from '../../entities/product.entity';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([ProductImage, Product, ChatSession, ChatMessage]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
