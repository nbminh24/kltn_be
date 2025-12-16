import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Query,
    UseGuards,
    BadRequestException
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiHeader,
    ApiParam
} from '@nestjs/swagger';

import { ChatbotService } from './chatbot.service';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

// DTOs
import { AddToCartInternalDto } from './dto/add-to-cart-internal.dto';
import { CancelOrderInternalDto } from './dto/cancel-order-internal.dto';
import { AddToWishlistInternalDto } from './dto/add-to-wishlist-internal.dto';
import { SizeAdviceDto } from './dto/size-advice.dto';
import { ProductRecommendDto } from './dto/product-recommend.dto';
import { ProductSearchDto } from './dto/product-search.dto';
import { GeminiAskDto } from './dto/gemini-ask.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';

/**
 * Internal APIs for Rasa chatbot
 * All endpoints require X-Internal-Api-Key header
 * These APIs bypass JWT authentication for Rasa actions
 */
@ApiTags('🤖 Chatbot Internal APIs')
@Controller('api/chatbot')
@UseGuards(InternalApiKeyGuard)
@ApiHeader({
    name: 'X-Internal-Api-Key',
    description: 'Internal API key for Rasa server authentication',
    required: true,
})
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) { }

    // ==================== CART APIs ====================

    @Get('cart/:customer_id')
    @ApiOperation({
        summary: '[Internal] Get cart by customer ID',
        description: 'Internal API for Rasa chatbot to retrieve customer cart. Returns cart items with product details, variants, and totals.',
    })
    @ApiParam({
        name: 'customer_id',
        description: 'Customer ID to get cart for',
        example: 123
    })
    @ApiResponse({
        status: 200,
        description: 'Cart retrieved successfully',
        schema: {
            example: {
                success: true,
                data: {
                    customer_id: 123,
                    items: [
                        {
                            id: 1,
                            product_id: 456,
                            product_name: 'Basic White T-Shirt',
                            variant_id: 789,
                            size: 'M',
                            color: 'White',
                            quantity: 2,
                            price: 150000,
                            image_url: 'https://...'
                        }
                    ],
                    total_items: 2,
                    subtotal: 300000,
                    total: 300000
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    @ApiResponse({
        status: 404,
        description: 'Customer not found'
    })
    async getCart(@Param('customer_id') customerId: string) {
        const id = parseInt(customerId, 10);
        if (isNaN(id)) {
            throw new BadRequestException('Invalid customer ID format');
        }

        const result = await this.chatbotService.getCart(id);

        return {
            success: true,
            data: result
        };
    }

    @Post('cart/add')
    @ApiOperation({
        summary: '[Internal] Add item to cart',
        description: 'Internal API for Rasa chatbot to add items to customer cart. Validates customer and stock before adding.',
    })
    @ApiResponse({
        status: 201,
        description: 'Item added to cart successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Insufficient stock'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    @ApiResponse({
        status: 404,
        description: 'Customer or product variant not found'
    })
    async addToCart(@Body() dto: AddToCartInternalDto) {
        const result = await this.chatbotService.addToCart(dto);

        return {
            success: true,
            data: result,
            message: 'Item added to cart successfully'
        };
    }

    // ==================== WISHLIST APIs ====================

    @Post('wishlist/add')
    @ApiOperation({
        summary: '[Internal] Add item to wishlist',
        description: 'Internal API for Rasa chatbot to add items to customer wishlist.',
    })
    @ApiResponse({
        status: 201,
        description: 'Item added to wishlist successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Item already in wishlist'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    @ApiResponse({
        status: 404,
        description: 'Customer or product variant not found'
    })
    async addToWishlist(@Body() dto: AddToWishlistInternalDto) {
        const result = await this.chatbotService.addToWishlist(dto);

        return {
            success: true,
            data: result,
            message: 'Item added to wishlist successfully'
        };
    }

    // ==================== ORDER APIs ====================

    @Post('orders/:id/cancel')
    @ApiOperation({
        summary: '[Internal] Cancel order',
        description: 'Internal API for Rasa chatbot to cancel customer orders. Only pending orders can be cancelled.',
    })
    @ApiParam({
        name: 'id',
        description: 'Order ID to cancel',
        example: 123
    })
    @ApiResponse({
        status: 200,
        description: 'Order cancelled successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Cannot cancel order with current status'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    @ApiResponse({
        status: 404,
        description: 'Order not found or does not belong to customer'
    })
    async cancelOrder(
        @Param('id') orderId: string,
        @Body() dto: CancelOrderInternalDto
    ) {
        const id = parseInt(orderId, 10);
        if (isNaN(id)) {
            throw new BadRequestException('Invalid order ID format');
        }

        const result = await this.chatbotService.cancelOrder(id, dto);

        return {
            success: true,
            data: result,
            message: 'Order cancelled successfully'
        };
    }

    // ==================== SIZE APIs ====================

    @Get('size-chart/:category')
    @ApiOperation({
        summary: '[Internal] Get size chart image URL',
        description: 'Returns size chart image URL for specific product category (shirt, pants, shoes).',
    })
    @ApiParam({
        name: 'category',
        description: 'Product category',
        enum: ['shirt', 'pants', 'shoes'],
        example: 'shirt'
    })
    @ApiResponse({
        status: 200,
        description: 'Size chart retrieved successfully'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    @ApiResponse({
        status: 404,
        description: 'Size chart not found for category'
    })
    async getSizeChart(@Param('category') category: string) {
        const result = await this.chatbotService.getSizeChart(category);

        return {
            success: true,
            data: result
        };
    }

    @Post('size-advice')
    @ApiOperation({
        summary: '[Internal] Get size recommendation',
        description: 'Get size recommendation based on customer height and weight. Returns recommended size with confidence level.',
    })
    @ApiResponse({
        status: 200,
        description: 'Size recommendation generated successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid height or weight values'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    async getSizeAdvice(@Body() dto: SizeAdviceDto) {
        const result = await this.chatbotService.getSizeAdvice(dto);

        return {
            success: true,
            data: result
        };
    }

    // ==================== PRODUCT RECOMMENDATION APIs ====================

    @Get('products/search')
    @ApiOperation({
        summary: '[Internal] Search products by keyword',
        description: 'Search products by name/description keywords. Prioritizes products matching all keywords over partial matches.',
    })
    @ApiResponse({
        status: 200,
        description: 'Products found successfully',
        schema: {
            example: {
                success: true,
                data: {
                    query: 'meow shirt',
                    total: 5,
                    products: [
                        {
                            product_id: 5,
                            name: 'Sushi Meow T-Shirt',
                            slug: 'sushi-meow-t-shirt',
                            price: 12.72,
                            thumbnail: 'https://...',
                            rating: 4.5,
                            in_stock: true
                        }
                    ]
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    async searchProducts(@Query() dto: ProductSearchDto) {
        const result = await this.chatbotService.searchProducts(dto);

        return {
            success: true,
            data: result
        };
    }

    @Get('products/recommend')
    @ApiOperation({
        summary: '[Internal] Get product recommendations',
        description: 'Get product recommendations based on context/occasion (wedding, beach, work, party, casual, sport). Uses JSONB attributes to match products.',
    })
    @ApiResponse({
        status: 200,
        description: 'Recommendations retrieved successfully'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    async getProductRecommendations(@Query() dto: ProductRecommendDto) {
        const result = await this.chatbotService.getProductRecommendations(dto);

        return {
            success: true,
            data: result
        };
    }

    // ==================== AUTH APIs ====================

    @Post('auth/verify')
    @ApiOperation({
        summary: '[Internal] Verify JWT token',
        description: 'Internal API for Rasa chatbot to verify JWT token and get customer information. Returns customer_id and profile data.',
    })
    @ApiResponse({
        status: 200,
        description: 'Token verified successfully',
        schema: {
            example: {
                success: true,
                data: {
                    customer_id: 123,
                    email: 'user@example.com',
                    name: 'John Doe'
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or expired token'
    })
    async verifyToken(@Body() dto: VerifyTokenDto) {
        const result = await this.chatbotService.verifyToken(dto.jwt_token);

        return {
            success: true,
            data: result
        };
    }

    // ==================== GEMINI AI APIs ====================

    @Post('gemini/ask')
    @ApiOperation({
        summary: '[Internal] Ask Gemini AI',
        description: 'Ask Google Gemini AI for questions outside chatbot scope (fashion advice, style tips, etc.). Returns AI-generated answer with fallback handling.',
    })
    @ApiResponse({
        status: 200,
        description: 'Question answered successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid question or Gemini API not configured'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or missing API key'
    })
    async askGemini(@Body() dto: GeminiAskDto) {
        const result = await this.chatbotService.askGemini(dto);

        return {
            success: true,
            data: result
        };
    }
}
