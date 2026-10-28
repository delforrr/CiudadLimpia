import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class AuthEndpointGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'no-store');
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method))
      return true;
    if (request.headers['sec-fetch-site'] === 'cross-site')
      throw new ForbiddenException('Solicitud de otro sitio rechazada');
    // JSON cannot be submitted by a cross-origin HTML form; CORS stays disabled.
    if (
      request.headers['content-type']?.split(';')[0].trim().toLowerCase() !==
      'application/json'
    ) {
      throw new UnsupportedMediaTypeException('Se requiere application/json');
    }
    return true;
  }
}
