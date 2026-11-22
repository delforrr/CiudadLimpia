import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';

describe('PrismaClientExceptionFilter', () => {
  let filter: PrismaClientExceptionFilter;
  let replyMock: jest.Mock;
  let getResponseMock: jest.Mock;
  let hostMock: ArgumentsHost;

  beforeEach(() => {
    replyMock = jest.fn();
    const fakeHttpAdapter = {
      reply: replyMock,
    };
    filter = new PrismaClientExceptionFilter(fakeHttpAdapter as never);

    getResponseMock = jest.fn().mockReturnValue({});
    hostMock = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: getResponseMock,
      }),
    } as unknown as ArgumentsHost;
  });

  it('mapea P2002 (unicidad) con target a ConflictException (409)', () => {
    const error = {
      code: 'P2002',
      meta: { target: ['patente'] },
    };

    filter.catch(error, hostMock);

    expect(replyMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Ya existe un registro con el valor especificado en: patente',
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  });

  it('mapea P2002 (unicidad) sin target a ConflictException (409) con mensaje por defecto', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique error', {
      code: 'P2002',
      clientVersion: '7.10.1',
    });

    filter.catch(error, hostMock);

    expect(replyMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Conflicto de unicidad: el recurso ya existe',
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  });

  it('mapea P2003 (relación/foreign key) a 409 con información del campo', () => {
    const error = {
      code: 'P2003',
      meta: { field_name: 'camionId' },
    };

    filter.catch(error, hostMock);

    expect(replyMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Conflicto de relación en el campo: camionId',
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  });

  it('mapea P2025 (no encontrado) a 404 con cause o mensaje por defecto', () => {
    const errorConCausa = {
      code: 'P2025',
      meta: { cause: 'Camión no encontrado en la base' },
    };

    filter.catch(errorConCausa, hostMock);

    expect(replyMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Camión no encontrado en la base',
        error: 'Not Found',
      },
      HttpStatus.NOT_FOUND,
    );

    replyMock.mockClear();

    const errorSinCausa = { code: 'P2025' };
    filter.catch(errorSinCausa, hostMock);

    expect(replyMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Registro no encontrado',
        error: 'Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  });

  it('delega en super.catch para códigos desconocidos de Prisma', () => {
    const superCatchSpy = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => {});

    const unknownPrismaError = { code: 'P9999' };
    filter.catch(unknownPrismaError, hostMock);

    expect(superCatchSpy).toHaveBeenCalledWith(unknownPrismaError, hostMock);
    superCatchSpy.mockRestore();
  });

  it('delega en super.catch para errores que no son de Prisma', () => {
    const superCatchSpy = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => {});

    const standardError = new Error('Regular runtime error');
    filter.catch(standardError, hostMock);

    expect(superCatchSpy).toHaveBeenCalledWith(standardError, hostMock);
    superCatchSpy.mockRestore();
  });

  it('soporta respuesta directa cuando httpAdapter no está configurado', () => {
    const filterSinAdapter = new PrismaClientExceptionFilter();
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const directResponseHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;

    filterSinAdapter.catch({ code: 'P2025' }, directResponseHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Registro no encontrado',
      error: 'Not Found',
    });
  });
});
