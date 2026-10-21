import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class AuthEndpointGuard implements CanActivate {
  // shortcut: counters belong to one process; use a shared limiter when deploying multiple replicas.
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') return true;
    if (request.headers['sec-fetch-site'] === 'cross-site')
      throw new ForbiddenException('Solicitud de otro sitio rechazada');
    // JSON cannot be submitted by a cross-origin HTML form; CORS stays disabled.
    if (
      request.headers['content-type']?.split(';')[0].trim().toLowerCase() !==
      'application/json'
    )
      throw new UnsupportedMediaTypeException('Se requiere application/json');
    if (request.path.endsWith('/logout')) return true;

    const now = Date.now();
    for (const [key, entry] of this.attempts) {
      if (entry.until <= now) this.attempts.delete(key);
    }
    const key = request.ip ?? 'unknown';
    const entry = this.attempts.get(key) ?? {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    this.attempts.set(key, entry);
    if (++entry.count > 10) {
      response.setHeader('Retry-After', Math.ceil((entry.until - now) / 1000));
      throw new HttpException('Demasiados intentos. Intentá más tarde.', 429);
    }
    return true;
  }
}
