import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const config = configService.get<AppConfig>('app')!;

  app.use(helmet());
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OTB Water Billing API')
    .setDescription('Water billing system for OTB community organizations')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
