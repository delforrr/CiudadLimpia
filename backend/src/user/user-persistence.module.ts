import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

@Module({
  imports: [ConfigModule],
  providers: [PrismaService, UserService],
  exports: [PrismaService, UserService],
})
export class UserPersistenceModule {}
