import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          request.headers.cookie
            ?.split(';')
            .find((part) => part.trim().startsWith('session='))
            ?.trim()
            .slice('session='.length) ?? null,
      ]),
    });
  }

  async validate(payload: unknown) {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !payload.sub
    ) {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Sesión inválida');
    return user;
  }
}
