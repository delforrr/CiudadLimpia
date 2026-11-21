import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ContratosConductorController } from './contratos-conductor.controller';
import { ContratosConductorService } from './contratos-conductor.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [ContratosConductorController],
  providers: [ContratosConductorService],
  exports: [ContratosConductorService],
})
export class ContratosConductorModule {}
