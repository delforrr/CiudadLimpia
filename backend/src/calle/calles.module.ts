import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { CallesController } from './calles.controller';
import { CallesService } from './calles.service';

@Module({
  imports: [AuthModule, UserPersistenceModule],
  controllers: [CallesController],
  providers: [CallesService],
})
export class CallesModule {}
