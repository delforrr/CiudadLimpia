import { Module } from '@nestjs/common';
import { PuntosLimpiosController } from './puntos-limpios.controller';
import { PuntosLimpiosService } from './puntos-limpios.service';

@Module({
  controllers: [PuntosLimpiosController],
  providers: [PuntosLimpiosService],
})
export class PuntosLimpiosModule {}
