import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { Admin } from './entities/admin.entity';
import { Customer } from './entities/customer.entity';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { Size } from './entities/size.entity';
import { Color } from './entities/color.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { CartItem } from './entities/cart-item.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { Cart } from './entities/cart.entity';
import { Review } from './entities/review.entity';
import { Promotion } from './entities/promotion.entity';
import { PromotionProduct } from './entities/promotion-product.entity';
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
import { SizesModule } from './modules/sizes/sizes.module';
import { ColorsModule } from './modules/colors/colors.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AccountModule } from './modules/account/account.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
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
            Size,
            Color,
            ProductImage,
            ProductVariant,
            Order,
            OrderItem,
            OrderStatusHistory,
            Cart,
            CartItem,
            WishlistItem,
            CustomerAddress,
            Review,
            Promotion,
            PromotionProduct,
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
    SizesModule,
    ColorsModule,
    CartModule,
    OrdersModule,
    WishlistModule,
    AddressesModule,
    AccountModule,
    SupportModule,
    AdminModule,
    PromotionsModule,
    CheckoutModule,
    AiModule,
    InternalModule,
  ],
})
export class AppModule {}
