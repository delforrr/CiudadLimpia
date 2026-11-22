import { Module } from '@nestjs/common';
import { TipoPuntoLimpioResiduoService } from './tipo-punto-limpio-residuo.service';

@Module({
  providers: [TipoPuntoLimpioResiduoService],
  exports: [TipoPuntoLimpioResiduoService],
})
export class TipoPuntoLimpioResiduoModule {}
