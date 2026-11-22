import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { DireccionesService } from './direcciones.service';

describe('DireccionesService', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const calleId = '00000000-0000-4000-8000-000000000002';
  const dto = { calle: 'Roca', altura: 50, lat: -35.97, long: -62.73 };
  const respuesta = { id, direccion: 'Roca 50', ...dto };
  const registro = { ...dto, id, calle: { calle: 'Roca' } };

  const db = {
    direccion: {
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
    db.calle.upsert.mockResolvedValue({ id: calleId });
  });

  it('devuelve la dirección por id o informa que no existe', async () => {
    db.direccion.findUnique.mockResolvedValueOnce(registro);
    await expect(service.findOne(id)).resolves.toEqual(respuesta);

    db.direccion.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registra el frente y el pin', async () => {
    db.direccion.create.mockResolvedValue(registro);

    await expect(service.create(dto)).resolves.toEqual(respuesta);
    expect(db.direccion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { calleId, altura: 50, lat: dto.lat, long: dto.long },
      }),
    );
  });

  it('propaga el error de Prisma al registrar una dirección duplicada', async () => {
    const error = errorPrisma('P2002');
    db.direccion.create.mockRejectedValue(error);

    await expect(service.create(dto)).rejects.toBe(error);
  });

  it('corrige el pin cuando coincide el frente indicado', async () => {
    const pin = { lat: -35.971, long: dto.long };
    db.direccion.findUnique.mockResolvedValue(registro);
    db.direccion.update.mockResolvedValue({ ...registro, ...pin });

    await expect(
      service.update(id, { ...pin, calle: 'roca', altura: 50 }),
    ).resolves.toEqual({
      ...respuesta,
      ...pin,
    });
    expect(db.direccion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: pin }),
    );
  });

  it.each([{ altura: 52 }, { calle: 'Belgrano' }, { lat: 0 }])(
    'rechaza un cambio de frente o un par incompleto: %j',
    async (dto) => {
      db.direccion.findUnique.mockResolvedValue(registro);
      await expect(service.update(id, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.direccion.update).not.toHaveBeenCalled();
    },
  );

  it('muestra el nombre actual de la calle', async () => {
    db.direccion.findUnique.mockResolvedValue({
      ...registro,
      calle: { calle: 'General Roca' },
    });
    await expect(service.findOne(id)).resolves.toEqual({
      ...respuesta,
      calle: 'General Roca',
      direccion: 'General Roca 50',
    });
  });

  it('elimina una dirección disponible', async () => {
    db.direccion.delete.mockResolvedValue(registro);

    await expect(service.remove(id)).resolves.toBeUndefined();
  });

  it.each(['P2003', 'P2025'])(
    'propaga el error %s al intentar eliminar una dirección',
    async (code) => {
      const error = errorPrisma(code);
      db.direccion.delete.mockRejectedValue(error);

      await expect(service.remove(id)).rejects.toBe(error);
    },
  );
});
