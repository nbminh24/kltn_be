import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { Admin } from './entities/admin.entity';
import { Customer } from './entities/customer.entity';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartItem } from './entities/cart-item.entity';
import { Wishlist } from './entities/wishlist.entity';
import { Address } from './entities/address.entity';
import { Review } from './entities/review.entity';
import { Promotion } from './entities/promotion.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { StaticPage } from './entities/static-page.entity';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { ChatbotMessage } from './entities/chatbot-message.entity';
import { AiRecommendation } from './entities/ai-recommendation.entity';

// Modules
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { AiModule } from './modules/ai/ai.module';
import { InternalModule } from './modules/internal/internal.module';

@Module({
  imports: [
    // Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM Module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isSupabase = databaseUrl?.includes('supabase.co');
        
        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [
            Admin,
            Customer,
            User,
            Product,
            Category,
            ProductImage,
            ProductVariant,
            Order,
            OrderItem,
            CartItem,
            Wishlist,
            Address,
            Review,
            Promotion,
            SupportTicket,
            StaticPage,
            ChatbotConversation,
            ChatbotMessage,
            AiRecommendation,
          ],
          synchronize: false,
          logging: false,
          // Only use SSL for Supabase
          ssl: isSupabase ? { rejectUnauthorized: false } : false,
          extra: isSupabase ? {
            max: 10,
            connectionTimeoutMillis: 10000,
          } : {},
        };
      },
      inject: [ConfigService],
    }),

    // HTTP Module (for AI services)
    HttpModule,

    // Common Module
    CommonModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    WishlistModule,
    AddressesModule,
    SupportModule,
    AdminModule,
    PromotionsModule,
    AiModule,
    InternalModule,
  ],
})
export class AppModule {}
