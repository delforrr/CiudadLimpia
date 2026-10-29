import { Module } from '@nestjs/common';
import { PuntosLimpiosController } from './puntos-limpios.controller';
import { PuntosLimpiosService } from './puntos-limpios.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PuntosLimpiosController],
  providers: [PuntosLimpiosService],
})
export class PuntosLimpiosModule {}
