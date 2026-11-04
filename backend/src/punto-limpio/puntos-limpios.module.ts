import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { DireccionesModule } from '../direccion/direcciones.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PuntosLimpiosController } from './puntos-limpios.controller';
import { PuntosLimpiosService } from './puntos-limpios.service';

@Module({
  imports: [AccountsModule, PrismaModule, DireccionesModule],
  controllers: [PuntosLimpiosController],
  providers: [PuntosLimpiosService],
})
export class PuntosLimpiosModule {}
