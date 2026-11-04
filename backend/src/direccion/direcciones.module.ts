import { Module } from '@nestjs/common';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { DireccionesController } from './direcciones.controller';
import { DireccionesService } from './direcciones.service';

@Module({
  imports: [UserPersistenceModule],
  controllers: [DireccionesController],
  providers: [DireccionesService],
  exports: [DireccionesService],
})
export class DireccionesModule {}
