import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserPersistenceModule } from './user-persistence.module';
import { UserAccessGuard } from './user-access.guard';

@Module({
  imports: [AuthModule, UserPersistenceModule],
  controllers: [UserController],
  providers: [UserAccessGuard],
})
export class UserModule {}
