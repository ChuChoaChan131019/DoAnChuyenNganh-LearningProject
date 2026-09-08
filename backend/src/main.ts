import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // CORS — cho phép frontend gọi API
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe — validate tất cả incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter formatting standard error envelope
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor formatting standard { data: ... } envelope
  app.useGlobalInterceptors(new ResponseInterceptor());


  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend is running on http://localhost:${port}`);
}
await bootstrap();

