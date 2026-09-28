import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
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

  // Scalar renders inline scripts, so the default helmet CSP would blank the page.
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
  // CORS: * reflects any origin with credentials; comma-separated list = whitelist
  const raw = config.corsOrigin;
  const corsOrigin =
    !raw || raw === '*' ? true : raw.split(',').map((o) => o.trim());
  app.enableCors({
    origin: corsOrigin,
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
  // Raw OpenAPI JSON for Postman / codegen imports.
  app.getHttpAdapter().get('/api/docs-json', (req, res) => res.json(document));
  // Scalar API reference (replaces Swagger UI) at /api/docs.
  app.use(
    '/api/docs',
    apiReference({
      content: document,
      theme: 'default',
      pageTitle: 'OTB Water Billing API',
    }),
  );

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`Scalar docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
