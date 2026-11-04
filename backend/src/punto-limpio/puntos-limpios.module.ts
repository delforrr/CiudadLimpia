import { Module } from '@nestjs/common';
import { PuntosLimpiosController } from './puntos-limpios.controller';
import { PuntosLimpiosService } from './puntos-limpios.service';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { DireccionesModule } from '../direccion/direcciones.module';

@Module({
  controllers: [PuntosLimpiosController],
  imports: [UserPersistenceModule, DireccionesModule],
  providers: [PuntosLimpiosService],
})
export class PuntosLimpiosModule {}
