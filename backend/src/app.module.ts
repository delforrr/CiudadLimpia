import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AccountsModule } from './accounts/accounts.module';
import { PuntosLimpiosModule } from './puntos-limpios/puntos-limpios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountsModule,
    PuntosLimpiosModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
