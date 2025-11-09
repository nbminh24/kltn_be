import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Frontend (localhost:3000)
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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
    .setTitle('🛍️ KLTN E-commerce API')
    .setDescription(`
      <h2>Backend API Documentation</h2>
      <p>Hệ thống E-commerce với tích hợp AI (Chatbot + Image Search)</p>
      
      <h3>📱 Authentication</h3>
      <ul>
        <li><strong>Customer Auth:</strong> Login/Register cho khách hàng</li>
        <li><strong>Admin Auth:</strong> Login cho quản trị viên</li>
      </ul>
      
      <h3>🛒 Customer APIs</h3>
      <ul>
        <li><strong>Public:</strong> Products, Categories (không cần token)</li>
        <li><strong>Protected:</strong> Cart, Orders, Wishlist, Account (cần JWT token)</li>
      </ul>
      
      <h3>⚙️ Admin APIs</h3>
      <ul>
        <li><strong>🔒 Requires JWT token + Admin role</strong></li>
        <li>Products, Variants, Images, Categories, Sizes, Colors, Orders, Customers</li>
      </ul>
      
      <h3>🤖 AI & Internal</h3>
      <ul>
        <li><strong>AI:</strong> Chatbot, Image Search</li>
        <li><strong>Internal:</strong> APIs cho Rasa Action Server (x-api-key required)</li>
      </ul>
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token (from login response)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key cho Internal APIs (dùng cho Rasa Action Server)',
      },
      'api-key',
    )
    // === AUTHENTICATION ===
    .addTag('🔐 Auth - Customer', 'Đăng nhập / Đăng ký cho khách hàng')
    .addTag('🔐 Auth - Admin', 'Đăng nhập cho quản trị viên')
    
    // === CUSTOMER - PUBLIC ===
    .addTag('🛍️ Customer - Products', '[PUBLIC] Danh sách sản phẩm, chi tiết sản phẩm')
    .addTag('🛍️ Customer - Categories', '[PUBLIC] Danh mục sản phẩm')
    
    // === CUSTOMER - PROTECTED ===
    .addTag('🛒 Customer - Cart', '[PROTECTED] Giỏ hàng - Yêu cầu JWT token')
    .addTag('📦 Customer - Orders', '[PROTECTED] Đơn hàng - Yêu cầu JWT token')
    .addTag('❤️ Customer - Wishlist', '[PROTECTED] Danh sách yêu thích - Yêu cầu JWT token')
    .addTag('👤 Customer - Account', '[PROTECTED] Quản lý tài khoản - Yêu cầu JWT token')
    
    // === ADMIN ===
    .addTag('⚙️ Admin - Products', '[ADMIN] Quản lý sản phẩm - Yêu cầu JWT + Admin role')
    .addTag('⚙️ Admin - Variants', '[ADMIN] Quản lý biến thể sản phẩm (Size/Color)')
    .addTag('⚙️ Admin - Images', '[ADMIN] Upload/Delete ảnh sản phẩm')
    .addTag('⚙️ Admin - Categories', '[ADMIN] Quản lý danh mục')
    .addTag('⚙️ Admin - Sizes', '[ADMIN] Quản lý kích cỡ')
    .addTag('⚙️ Admin - Colors', '[ADMIN] Quản lý màu sắc')
    .addTag('⚙️ Admin - Orders', '[ADMIN] Quản lý đơn hàng')
    .addTag('⚙️ Admin - Customers', '[ADMIN] Quản lý khách hàng')
    
    // === AI & INTERNAL ===
    .addTag('🤖 AI - Chatbot', 'Chatbot integration (Rasa)')
    .addTag('🖼️ AI - Image Search', 'Tìm kiếm sản phẩm bằng hình ảnh')
    .addTag('🔧 Internal APIs', '[INTERNAL] APIs cho Rasa Action Server - Yêu cầu x-api-key')
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

  const port = process.env.PORT || 3001; // Backend port (Frontend uses 3000)
  await app.listen(port);

  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║  🚀 KLTN E-commerce Backend is running!                  ║
  ║                                                           ║
  ║  📡 Server:        http://localhost:${port}                    ║
  ║  📚 API Docs:      http://localhost:${port}/api-docs          ║
  ║  🤖 AI Chatbot:    ${process.env.RASA_SERVER_URL || 'Not configured'}       ║
  ║  🖼️  AI Image:      ${process.env.FASTAPI_SERVICE_URL || 'Not configured'}  ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
