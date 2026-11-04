import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeocodificacionController } from './geocodificacion.controller';
import { GeocodificacionService } from './geocodificacion.service';

@Module({
  imports: [AuthModule],
  controllers: [GeocodificacionController],
  providers: [GeocodificacionService],
})
export class GeocodificacionModule {}
