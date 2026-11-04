import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { AuthAttemptsGuard } from '../auth/auth-attempts.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { UserAccessGuard } from '../user/user-access.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (
          secret.length < 32 ||
          secret === 'super-secret-jwt-key-change-in-production'
        ) {
          throw new Error(
            'JWT_SECRET debe ser aleatorio y tener al menos 32 caracteres',
          );
        }
        return { secret, signOptions: { algorithm: 'HS256' } };
      },
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    UserService,
    UserAccessGuard,
    RolesGuard,
    AuthEndpointGuard,
    AuthAttemptsGuard,
    JwtStrategy,
  ],
  exports: [RolesGuard, AuthEndpointGuard],
})
export class AccountsModule {}
