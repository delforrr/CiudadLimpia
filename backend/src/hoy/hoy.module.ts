import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HoyController } from './hoy.controller';
import { HoyService } from './hoy.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [HoyController],
  providers: [HoyService],
})
export class HoyModule {}
