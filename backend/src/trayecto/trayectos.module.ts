import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PuntosTrayectoModule } from '../punto-trayecto/puntos-trayecto.module';
import { LocalidadesController } from './localidades.controller';
import { SugerenciaTrayectoController } from './sugerencia-trayecto.controller';
import { SugerenciaTrayectoService } from './sugerencia-trayecto.service';
import { TrayectosController } from './trayectos.controller';
import { TrayectosService } from './trayectos.service';

@Module({
  imports: [AccountsModule, PrismaModule, PuntosTrayectoModule],
  controllers: [
    LocalidadesController,
    TrayectosController,
    SugerenciaTrayectoController,
  ],
  providers: [TrayectosService, SugerenciaTrayectoService],
})
export class TrayectosModule {}
