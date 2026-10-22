import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthEndpointGuard } from './auth-endpoint.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
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
        return {
          secret,
          signOptions: { algorithm: 'HS256' },
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [PrismaService, AuthService, AuthGuard, AuthEndpointGuard],
  exports: [AuthGuard, AuthEndpointGuard, PrismaService, JwtModule],
})
export class AuthModule {}
