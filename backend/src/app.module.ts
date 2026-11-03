import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PuntosLimpiosModule } from './punto-limpio/puntos-limpios.module';
import { TipoPuntoLimpioModule } from './tipo-punto-limpio/tipo-punto-limpio.module';
import { UserModule } from './user/user.module';
@Module({
  imports: [AuthModule, UserModule, PuntosLimpiosModule, TipoPuntoLimpioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
