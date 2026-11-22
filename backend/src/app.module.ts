import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AccountsModule } from './accounts/accounts.module';
import { CallesModule } from './calle/calles.module';
import { DireccionesModule } from './direccion/direcciones.module';
import { GeocodificacionModule } from './geocodificacion/geocodificacion.module';
import { PuntosLimpiosModule } from './punto-limpio/puntos-limpios.module';

import { TipoPuntoLimpioModule } from './tipo-punto-limpio/tipo-punto-limpio.module';
import { TrayectosModule } from './trayecto/trayectos.module';
import { CamionesModule } from './camiones/camiones.module';
import { TelemetriaModule } from './telemetria/telemetria.module';
import { HoyModule } from './hoy/hoy.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountsModule,
    CallesModule,
    DireccionesModule,
    GeocodificacionModule,
    PuntosLimpiosModule,
    TipoPuntoLimpioModule,
    TrayectosModule,
    CamionesModule,
    TelemetriaModule,
    HoyModule,
    PushModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
