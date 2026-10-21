import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AuthRequest = Request & { userId: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const cookie = request.headers.cookie
      ?.split(';')
      .find((part) => part.trim().startsWith('session='))
      ?.trim()
      .slice('session='.length);
    const [scheme, bearer] = request.headers.authorization?.split(' ') ?? [];
    const token = scheme === 'Bearer' ? bearer : cookie;
    if (!token) throw new UnauthorizedException('Se requiere iniciar sesión');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      if (typeof payload.sub !== 'string' || !payload.sub)
        throw new Error('Invalid subject');
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
  }
}
