import {
  StandardSchemaValidationPipe,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { setupSwagger } from './swagger';

export function configureApp(app: INestApplication) {
  if (process.env.TRUST_PROXY === '1')
    (app as NestExpressApplication).set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new StandardSchemaValidationPipe(),
  );
  setupSwagger(app);
}
