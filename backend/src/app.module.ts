import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AccountsModule } from './accounts/accounts.module';
import { PuntosLimpiosModule } from './punto-limpio/puntos-limpios.module';

import { TipoPuntoLimpioModule } from './tipo-punto-limpio/tipo-punto-limpio.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountsModule,
    PuntosLimpiosModule,
    TipoPuntoLimpioModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
