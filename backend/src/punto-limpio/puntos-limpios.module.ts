import { Module } from '@nestjs/common';
import { PuntosLimpiosController } from './puntos-limpios.controller';
import { PuntosLimpiosService } from './puntos-limpios.service';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { TipoPuntoLimpioModule } from '../tipo-punto-limpio/tipo-punto-limpio.module';

@Module({
  controllers: [PuntosLimpiosController],
  imports: [UserPersistenceModule, TipoPuntoLimpioModule],
  providers: [PuntosLimpiosService],
})
export class PuntosLimpiosModule {}
