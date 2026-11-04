import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { GeocodificacionController } from './geocodificacion.controller';
import { GeocodificacionService } from './geocodificacion.service';

@Module({
  imports: [AuthModule, UserPersistenceModule],
  controllers: [GeocodificacionController],
  providers: [GeocodificacionService],
})
export class GeocodificacionModule {}
