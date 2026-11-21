import { Module } from '@nestjs/common';
import { DireccionesModule } from '../direccion/direcciones.module';
import { PuntosTrayectoService } from './puntos-trayecto.service';

@Module({
  imports: [DireccionesModule],
  providers: [PuntosTrayectoService],
  exports: [PuntosTrayectoService],
})
export class PuntosTrayectoModule {}
