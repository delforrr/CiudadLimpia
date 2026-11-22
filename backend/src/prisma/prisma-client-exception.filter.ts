import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  type HttpServer,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client';

export type PrismaErrorLike = {
  code: string;
  meta?: Record<string, unknown>;
  message?: string;
};

type DirectResponse = {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

@Catch()
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  constructor(applicationRef?: HttpServer) {
    super(applicationRef);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!this.isPrismaError(exception)) {
      super.catch(exception, host);
      return;
    }

    const ctx = host.switchToHttp();
    const response: unknown = ctx.getResponse();

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        const target = exception.meta?.target;
        const targetStr = Array.isArray(target)
          ? target.join(', ')
          : typeof target === 'string'
            ? target
            : null;
        const message = targetStr
          ? `Ya existe un registro con el valor especificado en: ${targetStr}`
          : 'Conflicto de unicidad: el recurso ya existe';

        this.sendResponse(response, status, message, 'Conflict');
        break;
      }
      case 'P2003': {
        const status = HttpStatus.CONFLICT;
        const fieldName = exception.meta?.field_name;
        const fieldStr = typeof fieldName === 'string' ? fieldName : null;
        const message = fieldStr
          ? `Conflicto de relación en el campo: ${fieldStr}`
          : 'Conflicto de integridad referencial en la base de datos';

        this.sendResponse(response, status, message, 'Conflict');
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        const cause = exception.meta?.cause;
        const message =
          typeof cause === 'string' && cause.trim()
            ? cause
            : 'Registro no encontrado';

        this.sendResponse(response, status, message, 'Not Found');
        break;
      }
      default:
        super.catch(exception, host);
        break;
    }
  }

  private isPrismaError(error: unknown): error is PrismaErrorLike {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string' &&
        error.code.startsWith('P'))
    );
  }

  private sendResponse(
    response: unknown,
    statusCode: number,
    message: string,
    error: string,
  ): void {
    const body = {
      statusCode,
      message,
      error,
    };

    const adapter =
      this.applicationRef ||
      (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

    if (adapter) {
      adapter.reply(response, body, statusCode);
    } else if (this.isDirectResponse(response)) {
      response.status(statusCode).json(body);
    }
  }

  private isDirectResponse(response: unknown): response is DirectResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      'status' in response &&
      typeof response.status === 'function'
    );
  }
}
