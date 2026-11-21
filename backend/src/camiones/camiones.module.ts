import { Module } from '@nestjs/common';
import { ContratosConductorModule } from '../contrato-conductor/contratos-conductor.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';
import { ConductoresController } from './conductores.controller';
import { ConductoresService } from './conductores.service';

@Module({
  imports: [PrismaModule, ContratosConductorModule],
  controllers: [CamionesController, ConductoresController],
  providers: [CamionesService, ConductoresService],
  exports: [CamionesService],
})
export class CamionesModule {}
