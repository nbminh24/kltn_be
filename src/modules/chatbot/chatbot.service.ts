import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Entities
import { Customer } from '../../entities/customer.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';

// Services
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { WishlistService } from '../wishlist/wishlist.service';

// DTOs
import { AddToCartInternalDto } from './dto/add-to-cart-internal.dto';
import { CancelOrderInternalDto } from './dto/cancel-order-internal.dto';
import { AddToWishlistInternalDto } from './dto/add-to-wishlist-internal.dto';
import { SizeAdviceDto } from './dto/size-advice.dto';
import { ProductRecommendDto } from './dto/product-recommend.dto';
import { GeminiAskDto } from './dto/gemini-ask.dto';

@Injectable()
export class ChatbotService {
    private readonly logger = new Logger(ChatbotService.name);

    constructor(
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        @InjectRepository(ProductVariant)
        private readonly variantRepo: Repository<ProductVariant>,
        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        private readonly cartService: CartService,
        private readonly ordersService: OrdersService,
        private readonly wishlistService: WishlistService,
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) { }

    /**
     * Add item to cart (internal API for Rasa)
     * Validates customer and variant before calling CartService
     */
    async addToCart(dto: AddToCartInternalDto) {
        // Validate customer exists
        const customer = await this.customerRepo.findOne({
            where: { id: dto.customer_id }
        });

        if (!customer) {
            throw new NotFoundException(`Customer with ID ${dto.customer_id} not found`);
        }

        // Validate variant exists and has stock
        const variant = await this.variantRepo.findOne({
            where: { id: dto.variant_id },
            relations: ['product']
        });

        if (!variant) {
            throw new NotFoundException(`Product variant with ID ${dto.variant_id} not found`);
        }

        const availableStock = variant.total_stock - variant.reserved_stock;
        if (availableStock < dto.quantity) {
            throw new BadRequestException(
                `Insufficient stock. Only ${availableStock} items available`
            );
        }

        // Call existing CartService
        const result = await this.cartService.addItem(dto.customer_id, {
            variant_id: dto.variant_id,
            quantity: dto.quantity || 1,
        });

        return result;
    }

    /**
     * Add item to wishlist (internal API for Rasa)
     */
    async addToWishlist(dto: AddToWishlistInternalDto) {
        // Validate customer exists
        const customer = await this.customerRepo.findOne({
            where: { id: dto.customer_id }
        });

        if (!customer) {
            throw new NotFoundException(`Customer with ID ${dto.customer_id} not found`);
        }

        // Validate variant exists
        const variant = await this.variantRepo.findOne({
            where: { id: dto.variant_id }
        });

        if (!variant) {
            throw new NotFoundException(`Product variant with ID ${dto.variant_id} not found`);
        }

        // Call existing WishlistService
        const result = await this.wishlistService.addToWishlist(
            dto.customer_id,
            dto.variant_id
        );

        return result;
    }

    /**
     * Cancel order (internal API for Rasa)
     * Verifies order ownership before cancelling
     */
    async cancelOrder(orderId: number, dto: CancelOrderInternalDto) {
        // Verify order exists and belongs to customer
        const order = await this.orderRepo.findOne({
            where: {
                id: orderId,
                customer_id: dto.customer_id
            }
        });

        if (!order) {
            throw new NotFoundException(
                'Order not found or does not belong to this customer'
            );
        }

        // Check if order can be cancelled (only pending orders)
        if (order.fulfillment_status !== 'pending') {
            throw new BadRequestException(
                `Cannot cancel order with status: ${order.fulfillment_status}. Only pending orders can be cancelled.`
            );
        }

        // Call existing OrdersService
        const result = await this.ordersService.cancelOrder(dto.customer_id, orderId);

        return result;
    }

    /**
     * Get size chart image URL for category
     */
    async getSizeChart(category: string) {
        const categoryLower = category.toLowerCase();

        const sizeCharts = {
            shirt: this.configService.get('SIZE_CHART_SHIRT_URL'),
            pants: this.configService.get('SIZE_CHART_PANTS_URL'),
            shoes: this.configService.get('SIZE_CHART_SHOES_URL'),
        };

        const imageUrl = sizeCharts[categoryLower];

        if (!imageUrl) {
            throw new NotFoundException(
                `Size chart not found for category: ${category}. ` +
                `Valid categories: ${Object.keys(sizeCharts).join(', ')}`
            );
        }

        return {
            category: categoryLower,
            image_url: imageUrl,
            description: `Size chart for ${categoryLower}`
        };
    }

    /**
     * Get size recommendation based on height and weight
     * Simple rule-based logic (can be enhanced with ML later)
     */
    async getSizeAdvice(dto: SizeAdviceDto) {
        const { height, weight, category } = dto;

        let recommendedSize: string;
        let confidence: string;
        let reason: string;

        // Rule-based sizing logic
        if (height >= 160 && height <= 170 && weight >= 50 && weight <= 60) {
            recommendedSize = 'M';
            confidence = 'high';
            reason = 'Based on your height and weight measurements';
        } else if (height > 170 && height <= 180 && weight > 60 && weight <= 75) {
            recommendedSize = 'L';
            confidence = 'high';
            reason = 'Based on your height and weight measurements';
        } else if (height > 180 || weight > 75) {
            recommendedSize = 'XL';
            confidence = 'medium';
            reason = 'Based on your height and weight measurements';
        } else if (height < 160 || weight < 50) {
            recommendedSize = 'S';
            confidence = 'medium';
            reason = 'Based on your height and weight measurements';
        } else {
            recommendedSize = 'M';
            confidence = 'low';
            reason = 'General recommendation - please check size chart for accuracy';
        }

        return {
            recommended_size: recommendedSize,
            confidence,
            reason,
            note: 'This is a general recommendation. Please check the size chart for accurate measurements.',
            measurements: {
                height: `${height} cm`,
                weight: `${weight} kg`
            }
        };
    }

    /**
     * Get product recommendations based on context/occasion
     * Uses JSONB attributes to match products with specific tags
     */
    async getProductRecommendations(dto: ProductRecommendDto) {
        const { context, category, limit = 5 } = dto;

        // Build query
        const queryBuilder = this.productRepo
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('product.category', 'category')
            .where('product.status = :status', { status: 'active' })
            .andWhere('product.deleted_at IS NULL');

        // Filter by category if provided
        if (category) {
            queryBuilder.andWhere('category.slug = :category', { category: category.toLowerCase() });
        }

        // Filter by context using JSONB attributes
        if (context) {
            const contextLower = context.toLowerCase();

            // Map context to attribute tags
            const contextMapping = {
                wedding: ['wedding', 'formal', 'elegant', 'occasion'],
                beach: ['beach', 'summer', 'casual', 'light'],
                work: ['work', 'office', 'formal', 'professional'],
                party: ['party', 'evening', 'elegant', 'special'],
                casual: ['casual', 'everyday', 'comfortable'],
                sport: ['sport', 'athletic', 'active', 'gym'],
            };

            const searchTags = contextMapping[contextLower] || [contextLower];

            // Use JSONB operator to search for tags in attributes
            queryBuilder.andWhere(
                `product.attributes::jsonb @> :tags OR 
                 product.attributes::jsonb->>'occasion' = :context OR
                 product.attributes::jsonb->>'style' = :context`,
                {
                    tags: JSON.stringify({ tags: searchTags }),
                    context: contextLower
                }
            );
        }

        // Order by rating and limit results
        queryBuilder
            .orderBy('product.average_rating', 'DESC')
            .addOrderBy('product.total_reviews', 'DESC')
            .take(limit);

        const products = await queryBuilder.getMany();

        // Format response
        const recommendations = products.map(product => {
            const firstVariant = product.variants?.[0];
            const availableStock = firstVariant
                ? firstVariant.total_stock - firstVariant.reserved_stock
                : 0;

            return {
                product_id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.selling_price,
                thumbnail: product.thumbnail_url,
                rating: product.average_rating,
                reviews: product.total_reviews,
                category: product.category?.name,
                in_stock: availableStock > 0,
                attributes: product.attributes,
            };
        });

        return {
            context: context || 'general',
            total: recommendations.length,
            recommendations,
        };
    }

    /**
     * Ask Gemini AI for questions outside chatbot scope
     * Uses Google Gemini API
     */
    async askGemini(dto: GeminiAskDto) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            throw new BadRequestException(
                'Gemini API is not configured. Please contact administrator.'
            );
        }

        const { question } = dto;

        try {
            // Prepare system prompt for fashion e-commerce context
            const systemPrompt =
                'You are a helpful fashion assistant for an e-commerce store. ' +
                'Provide concise, friendly advice about fashion, clothing, styles, and shopping. ' +
                'Keep responses brief (2-3 sentences max). ' +
                'If asked about specific products, prices, or orders, politely direct users to browse the store or contact support.';

            const fullPrompt = `${systemPrompt}\n\nUser question: ${question}`;

            // Call Gemini API
            const response = await firstValueFrom(
                this.httpService.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                    {
                        contents: [{
                            parts: [{
                                text: fullPrompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 200,
                            topP: 0.8,
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000,
                    }
                )
            );

            const answer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!answer) {
                throw new Error('No response from Gemini API');
            }

            this.logger.log(`Gemini answered: "${question}" -> "${answer.substring(0, 50)}..."`);

            return {
                question,
                answer,
                source: 'Gemini AI',
            };

        } catch (error) {
            this.logger.error(`Gemini API error: ${error.message}`, error.stack);

            // Return fallback response
            return {
                question,
                answer: "I'm sorry, I couldn't process your question right now. Please try asking something else or contact our support team for assistance.",
                source: 'Fallback',
                error: true,
            };
        }
    }
}
