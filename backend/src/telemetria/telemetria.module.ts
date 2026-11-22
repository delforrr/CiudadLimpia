import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { TelemetriaController } from './telemetria.controller';
import { TelemetriaService } from './telemetria.service';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [TelemetriaController],
  providers: [TelemetriaService],
})
export class TelemetriaModule {}
