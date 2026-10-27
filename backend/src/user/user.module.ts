import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserAccessGuard } from './user-access.guard';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, UserAccessGuard],
})
export class UserModule {}
