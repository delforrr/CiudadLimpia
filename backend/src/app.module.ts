import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PuntosLimpiosModule } from './puntos-limpios/puntos-limpios.module';
import { UserModule } from './user/user.module';
@Module({
  imports: [AuthModule, UserModule, PuntosLimpiosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
