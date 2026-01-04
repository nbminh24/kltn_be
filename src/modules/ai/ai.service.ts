import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { ProductImage } from '../../entities/product-image.entity';
import { Product } from '../../entities/product.entity';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

@Injectable()
export class AiService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  async chatbot(message: string, sessionId: string, customerId?: number) {
    const rasaUrl = this.configService.get<string>('RASA_SERVER_URL');

    try {
      // Forward request to Rasa Server
      const response = await firstValueFrom(
        this.httpService.post(`${rasaUrl}/webhooks/rest/webhook`, {
          sender: sessionId,
          message: message,
        }),
      );

      // Find or create chat session
      let session = await this.sessionRepository.findOne({
        where: customerId ? { customer_id: customerId } : { visitor_id: sessionId },
      });

      if (!session) {
        session = this.sessionRepository.create({
          customer_id: customerId || null,
          visitor_id: customerId ? null : sessionId,
        });
        await this.sessionRepository.save(session);
      }

      // Save user message
      await this.messageRepository.save({
        session_id: session.id,
        sender: 'customer',
        message: message,
        is_read: false,
      });

      // Save bot responses
      const botResponses = response.data || [];
      for (const botMsg of botResponses) {
        await this.messageRepository.save({
          session_id: session.id,
          sender: 'bot',
          message: botMsg.text || '',
          is_read: false,
        });
      }

      return {
        responses: botResponses,
        session_id: sessionId,
      };
    } catch (error) {
      // If Rasa server is down, return a fallback message
      return {
        responses: [
          {
            text: 'Xin lỗi, chatbot hiện không khả dụng. Vui lòng thử lại sau.',
          },
        ],
        session_id: sessionId,
        error: 'Rasa server unavailable',
      };
    }
  }

  async searchByImage(_imageFile: Express.Multer.File) {
    // const fastApiUrl = this.configService.get<string>('FASTAPI_SERVICE_URL');

    try {
      // Step 1: Send image to FastAPI to get vector
      // Note: In a real implementation, you would send the image buffer to FastAPI
      // For now, we'll mock the response since FormData handling in Node.js requires additional setup

      // Mock response for development (replace with actual API call when FastAPI is ready)
      const mockVector = Array.from({ length: 512 }, () => Math.random());
      const encodeResponse = { data: { vector: mockVector } };

      // Uncomment below when FastAPI is ready:
      // const FormData = require('form-data');
      // const formData = new FormData();
      // formData.append('file', imageFile.buffer, {
      //   filename: imageFile.originalname,
      //   contentType: imageFile.mimetype,
      // });
      // const encodeResponse = await firstValueFrom(
      //   this.httpService.post(`${fastApiUrl}/ai/encode-image`, formData, {
      //     headers: formData.getHeaders(),
      //   }),
      // );

      const imageVector = encodeResponse.data.vector;

      // Step 2: Query database using pgvector
      // Convert vector array to pgvector format: '[0.1,0.2,...]'
      const vectorString = `[${imageVector.join(',')}]`;

      // Use raw query with pgvector operator <-> (cosine distance)
      const similarImages = await this.productImageRepository
        .createQueryBuilder('pi')
        .select('pi.product_id')
        .addSelect(`pi.image_vector <-> '${vectorString}'::vector`, 'distance')
        .where('pi.image_vector IS NOT NULL')
        .orderBy('distance', 'ASC')
        .limit(20)
        .getRawMany();

      // Get unique product IDs
      const productIds = [...new Set(similarImages.map(img => img.product_id))];

      // Fetch products with details
      const products = await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.category', 'category')
        .where('product.id IN (:...productIds)', { productIds })
        .andWhere('product.status = :status', { status: 'Active' })
        .take(10)
        .getMany();

      return {
        message: 'Image search completed',
        results: products,
        count: products.length,
      };
    } catch (error) {
      // If FastAPI is down, return empty results
      return {
        message: 'Image search service unavailable',
        results: [],
        count: 0,
        error: error.message,
      };
    }
  }
}
