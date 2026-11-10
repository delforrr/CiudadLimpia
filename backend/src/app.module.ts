import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AccountsModule } from './accounts/accounts.module';
import { CallesModule } from './calle/calles.module';
import { GeocodificacionModule } from './geocodificacion/geocodificacion.module';
import { PuntosLimpiosModule } from './punto-limpio/puntos-limpios.module';

import { TipoPuntoLimpioModule } from './tipo-punto-limpio/tipo-punto-limpio.module';
import { TrayectosModule } from './trayecto/trayectos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountsModule,
    CallesModule,
    GeocodificacionModule,
    PuntosLimpiosModule,
    TipoPuntoLimpioModule,
    TrayectosModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
