import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DireccionesController } from './direcciones.controller';
import { DireccionesService } from './direcciones.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [DireccionesController],
  providers: [DireccionesService],
  exports: [DireccionesService],
})
export class DireccionesModule {}
