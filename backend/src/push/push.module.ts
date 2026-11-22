import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EnvioPushService, TransportePush } from './envio-push.service';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [PushController],
  providers: [PushService, EnvioPushService, TransportePush],
  exports: [PushService],
})
export class PushModule {}
