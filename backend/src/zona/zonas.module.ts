import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ZonasController } from './zonas.controller';
import { ZonasService } from './zonas.service';

@Module({
  imports: [AccountsModule, PrismaModule],
  controllers: [ZonasController],
  providers: [ZonasService],
})
export class ZonasModule {}
