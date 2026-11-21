import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TipoPuntoLimpioResiduoModule } from '../tipo-punto-limpio-residuo/tipo-punto-limpio-residuo.module';
import { TipoPuntoLimpioController } from './tipo-punto-limpio.controller';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

@Module({
  imports: [AccountsModule, PrismaModule, TipoPuntoLimpioResiduoModule],
  controllers: [TipoPuntoLimpioController],
  providers: [TipoPuntoLimpioService],
  exports: [TipoPuntoLimpioService],
})
export class TipoPuntoLimpioModule {}
