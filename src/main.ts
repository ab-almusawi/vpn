import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('VPN Backend API')
    .setDescription('NestJS backend for WireGuard VPN server management')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('health', 'System health monitoring')
    .addTag('vpn', 'VPN configuration management')
    .addTag('clients', 'Client management (Admin only)')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.SERVER_PORT || 3000;
  const host = process.env.SERVER_HOST || '0.0.0.0';
  
  await app.listen(port, host);
  
  console.log(`Application is running on: http://${host}:${port}`);
  console.log(`Swagger documentation: http://${host}:${port}/api/docs`);
}

bootstrap();
