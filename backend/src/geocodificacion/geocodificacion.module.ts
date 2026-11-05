import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GeocodificacionController } from './geocodificacion.controller';
import { GeocodificacionService } from './geocodificacion.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [GeocodificacionController],
  providers: [GeocodificacionService],
})
export class GeocodificacionModule {}
