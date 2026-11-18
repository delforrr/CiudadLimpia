import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';

@Module({
  imports: [PrismaModule],
  controllers: [CamionesController],
  providers: [CamionesService],
  exports: [CamionesService],
})
export class CamionesModule {}
