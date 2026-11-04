import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { DireccionesService } from './direcciones.service';

describe('DireccionesService', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const calleId = '00000000-0000-4000-8000-000000000002';
  const dto = { calle: 'Roca', altura: 50 };
  const respuesta = { id, direccion: 'Roca 50', calle: 'Roca', altura: 50 };
  const registro = { ...respuesta, calle: { calle: 'Roca' } };
  const historica = { id, direccion: 'Roca 50', calle: null, altura: null };

  const db = {
    direccion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    calle: { upsert: jest.fn() },
  };
  const prisma = {
    ...db,
    $transaction: (operation: (tx: typeof db) => Promise<unknown>) =>
      operation(db),
  };
  const service = new DireccionesService(prisma as unknown as PrismaService);

  function errorPrisma(code: string) {
    return new Prisma.PrismaClientKnownRequestError('Error de prueba', {
      code,
      clientVersion: 'test',
    });
  }

  beforeEach(() => {
    jest.resetAllMocks();
    db.calle.upsert.mockResolvedValue({ id: calleId, calle: 'Roca' });
  });

  it('devuelve direcciones históricas aunque no tengan calle ni altura estructuradas', async () => {
    db.direccion.findMany.mockResolvedValue([historica]);

    await expect(service.findAll()).resolves.toEqual([historica]);
  });

  it('devuelve la dirección por id o informa que no existe', async () => {
    db.direccion.findUnique.mockResolvedValueOnce(registro);
    await expect(service.findOne(id)).resolves.toEqual(respuesta);

    db.direccion.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registra la dirección con la calle resuelta y su altura', async () => {
    db.direccion.create.mockResolvedValue(registro);

    await expect(service.create(dto)).resolves.toEqual(respuesta);
    expect(db.direccion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { calleId, altura: 50, direccion: 'Roca 50' },
      }),
    );
  });

  it('informa un conflicto al registrar una dirección duplicada', async () => {
    db.direccion.create.mockRejectedValue(errorPrisma('P2002'));

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('mantiene la calle al editar solo la altura', async () => {
    db.direccion.findUnique.mockResolvedValue(registro);
    db.direccion.update.mockResolvedValue({
      ...registro,
      altura: 52,
      direccion: 'Roca 52',
    });

    await expect(service.update(id, { altura: 52 })).resolves.toEqual({
      ...respuesta,
      altura: 52,
      direccion: 'Roca 52',
    });
    expect(db.direccion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { calleId, altura: 52, direccion: 'Roca 52' },
      }),
    );
  });

  it('exige calle y altura al completar una dirección histórica', async () => {
    db.direccion.findUnique.mockResolvedValue(historica);

    await expect(service.update(id, { altura: 52 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('elimina una dirección disponible', async () => {
    db.direccion.delete.mockResolvedValue(registro);

    await expect(service.remove(id)).resolves.toBeUndefined();
  });

  it.each([
    ['P2003', ConflictException],
    ['P2025', NotFoundException],
  ])(
    'traduce el error %s al intentar eliminar una dirección',
    async (code, tipo) => {
      db.direccion.delete.mockRejectedValue(errorPrisma(code));

      await expect(service.remove(id)).rejects.toBeInstanceOf(tipo);
    },
  );
});
