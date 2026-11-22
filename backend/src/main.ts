import { NestFactory } from '@nestjs/core';
import {
  getDefaultAutoSelectFamilyAttemptTimeout,
  setDefaultAutoSelectFamilyAttemptTimeout,
} from 'node:net';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  // OSRM puede tardar más que el margen predeterminado del intento IPv4.
  setDefaultAutoSelectFamilyAttemptTimeout(
    Math.max(getDefaultAutoSelectFamilyAttemptTimeout(), 1200),
  );
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
