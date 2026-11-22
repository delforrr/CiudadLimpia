import { Module } from '@nestjs/common';
import { PuntosTrayectoService } from './puntos-trayecto.service';

@Module({
  providers: [PuntosTrayectoService],
  exports: [PuntosTrayectoService],
})
export class PuntosTrayectoModule {}
