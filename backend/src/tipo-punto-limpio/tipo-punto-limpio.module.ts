import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { TipoPuntoLimpioController } from './tipo-punto-limpio.controller';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

@Module({
  imports: [AuthModule, UserPersistenceModule],
  controllers: [TipoPuntoLimpioController],
  providers: [TipoPuntoLimpioService],
})
export class TipoPuntoLimpioModule {}
