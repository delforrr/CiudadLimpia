import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CallesController } from './calles.controller';
import { CallesService } from './calles.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [CallesController],
  providers: [CallesService],
})
export class CallesModule {}
