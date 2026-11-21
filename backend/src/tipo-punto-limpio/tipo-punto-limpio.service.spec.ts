import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoPuntoLimpioResiduoService } from '../tipo-punto-limpio-residuo/tipo-punto-limpio-residuo.service';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

describe('TipoPuntoLimpioService', () => {
  const tipoId = '00000000-0000-4000-8000-000000000001';
  const residuoId = '00000000-0000-4000-8000-000000000002';
  const record = {
    id: tipoId,
    nombre: 'Botellero',
    residuos: [{ residuo: { id: residuoId, nombre: 'Botellas' } }],
  };
  const response = {
    id: tipoId,
    nombre: 'Botellero',
    residuos: [{ id: residuoId, nombre: 'Botellas' }],
  };

  let service: TipoPuntoLimpioService;
  let prisma: {
    tipoPuntoLimpio: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      tipoPuntoLimpio: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new TipoPuntoLimpioService(
      prisma as unknown as PrismaService,
      new TipoPuntoLimpioResiduoService(),
    );
  });

  it('creates a tipo with its residuos', async () => {
    prisma.tipoPuntoLimpio.create.mockResolvedValue(record);

    await expect(
      service.create({ nombre: 'Botellero', residuos: [residuoId] }),
    ).resolves.toEqual(response);
    const calls = prisma.tipoPuntoLimpio.create.mock.calls as [
      { data: unknown; select: unknown },
    ][];
    expect(calls[0][0].data).toEqual({
      nombre: 'Botellero',
      residuos: { create: [{ residuoId }] },
    });
    expect(calls[0][0].select).toBeDefined();
  });

  it('creates a tipo without residuos', async () => {
    prisma.tipoPuntoLimpio.create.mockResolvedValue({
      ...record,
      residuos: [],
    });

    await expect(service.create({ nombre: 'Botellero' })).resolves.toEqual({
      ...response,
      residuos: [],
    });
    const calls = prisma.tipoPuntoLimpio.create.mock.calls as [
      { data: unknown; select: unknown },
    ][];
    expect(calls[0][0].data).toEqual({ nombre: 'Botellero' });
    expect(calls[0][0].select).toBeDefined();
  });

  it('lists tipos ordered by name', async () => {
    prisma.tipoPuntoLimpio.findMany.mockResolvedValue([record]);

    await expect(service.findAll()).resolves.toEqual([response]);
    const calls = prisma.tipoPuntoLimpio.findMany.mock.calls as [
      { select: unknown; orderBy: unknown },
    ][];
    expect(calls[0][0].select).toBeDefined();
    expect(calls[0][0].orderBy).toEqual({ nombre: 'asc' });
  });

  it('finds one tipo or throws when it does not exist', async () => {
    prisma.tipoPuntoLimpio.findUnique.mockResolvedValueOnce(record);
    await expect(service.findOne(tipoId)).resolves.toEqual(response);

    prisma.tipoPuntoLimpio.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne(tipoId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('replaces residuos on update and preserves them when omitted', async () => {
    prisma.tipoPuntoLimpio.update.mockResolvedValue(record);

    await service.update(tipoId, { residuos: [residuoId] });
    const calls = prisma.tipoPuntoLimpio.update.mock.calls as [
      { where: unknown; data: unknown; select: unknown },
    ][];
    expect(calls[0][0].where).toEqual({ id: tipoId });
    expect(calls[0][0].data).toEqual({
      residuos: {
        deleteMany: {},
        create: [{ residuoId }],
      },
    });
    expect(calls[0][0].select).toBeDefined();

    await service.update(tipoId, { nombre: 'Botellero' });
    const lastCall = (
      prisma.tipoPuntoLimpio.update.mock.calls as [
        { where: unknown; data: unknown; select: unknown },
      ][]
    ).at(-1);
    expect(lastCall?.[0].where).toEqual({ id: tipoId });
    expect(lastCall?.[0].data).toEqual({ nombre: 'Botellero' });
    expect(lastCall?.[0].select).toBeDefined();
  });

  it.each(['P2002', 'P2003'])(
    'propaga el error %s de Prisma al crear un tipo',
    async (code) => {
      const error = { code };
      prisma.tipoPuntoLimpio.create.mockRejectedValueOnce(error);

      await expect(
        service.create({ nombre: 'Botellero', residuos: [residuoId] }),
      ).rejects.toBe(error);
    },
  );

  it('elimina un tipo', async () => {
    await expect(service.remove(tipoId)).resolves.toBeUndefined();
  });

  it.each(['P2025', 'P2003'])(
    'propaga el error %s de Prisma al eliminar un tipo',
    async (code) => {
      const error = { code };
      prisma.tipoPuntoLimpio.delete.mockRejectedValueOnce(error);

      await expect(service.remove(tipoId)).rejects.toBe(error);
    },
  );
});
