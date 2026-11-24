import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TipoPuntoLimpioController } from './tipo-punto-limpio.controller';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [TipoPuntoLimpioController],
  providers: [TipoPuntoLimpioService],
  exports: [TipoPuntoLimpioService],
})
export class TipoPuntoLimpioModule {}
