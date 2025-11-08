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
    .setTitle('KLTN E-commerce API')
    .setDescription('Backend API cho hệ thống E-commerce với tích hợp AI (Chatbot + Image Search)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
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
    .addTag('Authentication', 'APIs xác thực người dùng')
    .addTag('Users', 'Quản lý thông tin người dùng')
    .addTag('Products', 'Quản lý sản phẩm')
    .addTag('Categories', 'Quản lý danh mục')
    .addTag('Cart', 'Giỏ hàng')
    .addTag('Orders', 'Đơn hàng')
    .addTag('Wishlist', 'Danh sách yêu thích')
    .addTag('Addresses', 'Sổ địa chỉ')
    .addTag('Support', 'Hỗ trợ khách hàng')
    .addTag('Admin', 'Quản trị hệ thống')
    .addTag('AI', 'Tích hợp AI (Chatbot + Image Search)')
    .addTag('Internal', 'APIs nội bộ (cho Rasa)')
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
