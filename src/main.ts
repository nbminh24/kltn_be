import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Frontend
  app.enableCors({
    origin: true, // Allow all origins for development/testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('🛍️ LeCas Fashion - E-commerce API')
    .setDescription(
      `
      <h2>📚 Backend API Documentation - LeCas Fashion</h2>
      <p><strong>Version:</strong> 1.0 | <strong>Updated:</strong> November 2024</p>
      <p>Hệ thống E-commerce hoàn chỉnh với tích hợp AI (Chatbot + Image Search)</p>
      
      <hr/>
      
      <h3>🔐 Authentication & Authorization</h3>
      <ul>
        <li><strong>Customer:</strong> JWT token từ đăng nhập/đăng ký</li>
        <li><strong>Admin:</strong> JWT token + Admin role</li>
        <li><strong>Internal:</strong> API Key (x-api-key header) cho Rasa Action Server</li>
      </ul>
      
      <h3>📱 Customer Features (Khách hàng)</h3>
      <ul>
        <li>✅ Public: Products, Categories, Pages (CMS)</li>
        <li>🔒 Protected: Cart, Checkout, Orders, Reviews, Wishlist, Account, Support</li>
      </ul>
      
      <h3>⚙️ Admin Features (Quản trị viên)</h3>
      <ul>
        <li>📊 Dashboard & Analytics - KPIs, Charts, Statistics</li>
        <li>🛍️ Product Management - Products, Variants, Images, Categories</li>
        <li>📦 Order Management - View, Update Status, Email Notifications</li>
        <li>👥 Customer Management - View, Activate/Deactivate Accounts</li>
        <li>📝 Review Management - Approve/Reject Reviews</li>
        <li>📦 Inventory Management - Stock, Restock (Manual + Excel)</li>
        <li>🎁 Promotion Management - Flash Sales, Discounts</li>
        <li>💬 Support Management - Tickets, Replies (với Email Notifications)</li>
        <li>📄 CMS - Static Pages (About Us, Policies, Terms)</li>
        <li>🤖 AI Management - Chatbot, Image Search, Recommendations</li>
      </ul>
      
      <h3>🤖 AI Features</h3>
      <ul>
        <li>💬 AI Chatbot - Tích hợp Rasa NLU</li>
        <li>🖼️ AI Image Search - Tìm kiếm sản phẩm bằng hình ảnh</li>
        <li>🎯 AI Recommendations - Gợi ý sản phẩm thông minh</li>
      </ul>
    `,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: '🔑 JWT Token từ API đăng nhập (Customer hoặc Admin)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: '🔐 API Key cho Internal APIs (Rasa Action Server)',
      },
      'api-key',
    )

    // ==================== AUTHENTICATION ====================
    .addTag('Auth', '🔐 Authentication - Đăng nhập & Đăng ký')
    .addTag('Auth - Admin', '🔐 Admin Authentication - Đăng nhập quản trị viên')

    // ==================== CUSTOMER - PUBLIC ====================
    .addTag('Products', '🛍️ Products - Sản phẩm [PUBLIC]')
    .addTag('Categories', '📂 Categories - Danh mục [PUBLIC]')
    .addTag('Sizes', '📏 Sizes - Kích cỡ [PUBLIC]')
    .addTag('Colors', '🎨 Colors - Màu sắc [PUBLIC]')
    .addTag('Pages (Public)', '📄 Pages - Trang tĩnh [PUBLIC]')

    // ==================== CUSTOMER - PROTECTED ====================
    .addTag('Cart', '🛒 Cart - Giỏ hàng [PROTECTED]')
    .addTag('Checkout', '💳 Checkout & Payment - Thanh toán [PROTECTED]')
    .addTag('Orders', '📦 Orders - Đơn hàng [PROTECTED]')
    .addTag('Reviews', '⭐ Reviews - Đánh giá sản phẩm [PROTECTED]')
    .addTag('Wishlist', '❤️ Wishlist - Yêu thích [PROTECTED]')
    .addTag('Account', '👤 Account - Tài khoản & Địa chỉ [PROTECTED]')
    .addTag('Support', '💬 Support - Hỗ trợ khách hàng [PROTECTED]')

    // ==================== ADMIN - DASHBOARD & ANALYTICS ====================
    .addTag('Admin - Analytics', '📊 Analytics - Dashboard & Thống kê [ADMIN]')

    // ==================== ADMIN - PRODUCTS ====================
    .addTag('Admin - Products', '🛍️ Admin Products - Quản lý sản phẩm [ADMIN]')
    .addTag('Admin - Variants', '🔀 Admin Variants - Quản lý biến thể [ADMIN]')
    .addTag('Admin - Images', '🖼️ Admin Images - Quản lý ảnh sản phẩm [ADMIN]')
    .addTag('Admin - Categories', '📂 Admin Categories - Quản lý danh mục [ADMIN]')

    // ==================== ADMIN - OPERATIONS ====================
    .addTag('Admin - Orders', '📦 Admin Orders - Quản lý đơn hàng [ADMIN]')
    .addTag('Admin - Reviews', '⭐ Admin Reviews - Quản lý đánh giá [ADMIN]')
    .addTag('Admin - Customers', '👥 Admin Customers - Quản lý khách hàng [ADMIN]')
    .addTag('Admin - Inventory', '📦 Admin Inventory - Quản lý tồn kho [ADMIN]')
    .addTag('Admin - Promotions', '🎁 Admin Promotions - Quản lý khuyến mãi [ADMIN]')
    .addTag('Admin - Support', '💬 Admin Support - Quản lý hỗ trợ [ADMIN]')

    // ==================== ADMIN - CMS & CONTENT ====================
    .addTag('Admin - CMS Pages', '📄 Admin CMS - Quản lý trang tĩnh [ADMIN]')

    // ==================== ADMIN - AI & CHATBOT ====================
    .addTag('Admin - AI', '🤖 Admin AI - Quản lý AI & Chatbot [ADMIN]')

    // ==================== AI PUBLIC ====================
    .addTag('AI - Chatbot', '🤖 AI Chatbot - Trò chuyện với AI')
    .addTag('AI - Image Search', '🖼️ AI Image Search - Tìm kiếm bằng ảnh')

    // ==================== INTERNAL APIS ====================
    .addTag('Internal APIs', '🔧 Internal - APIs cho Rasa Action Server [INTERNAL]')

    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'KLTN API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║  🚀 KLTN E-commerce Backend is running!                  ║
  ║                                                           ║
  ║  📡 Server:        ${isProduction ? 'Production' : `http://localhost:${port}`}  ║
  ║  📚 API Docs:      ${isProduction ? '/api-docs' : `http://localhost:${port}/api-docs`}  ║
  ║  🤖 AI Chatbot:    ${process.env.RASA_SERVER_URL || 'Not configured'}       ║
  ║  🖼️  AI Image:      ${process.env.FASTAPI_SERVICE_URL || 'Not configured'}  ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
