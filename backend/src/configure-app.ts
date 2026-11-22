import {
  StandardSchemaValidationPipe,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';
import { setupSwagger } from './swagger';

export function configureApp(app: INestApplication) {
  if (process.env.TRUST_PROXY === '1')
    (app as NestExpressApplication).set('trust proxy', 1);
  app.useGlobalPipes(
    new StandardSchemaValidationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
  setupSwagger(app);
}
