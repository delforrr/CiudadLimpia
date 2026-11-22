import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Estado } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ContratosConductorService } from './contratos-conductor.service';

describe('ContratosConductorService', () => {
  const periodo = {
    idCamion: 'camion',
    idConductor: 'conductor',
    fechaInicio: '2026-11-21T08:00:00-03:00',
    fechaFin: '2026-11-22T08:00:00-03:00',
  };
  const fechaInicio = new Date(periodo.fechaInicio);
  const fechaFin = new Date(periodo.fechaFin);

  const tx = {
    camion: { findUnique: jest.fn() },
    conductor: { findUnique: jest.fn() },
    contratoConductor: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const db = { $transaction: jest.fn() };
  const service = new ContratosConductorService(db as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(
      (operacion: (client: typeof tx) => unknown) => operacion(tx),
    );
    tx.camion.findUnique.mockResolvedValue({ estado: Estado.ACTIVO });
    tx.conductor.findUnique.mockResolvedValue({ activo: true });
    tx.contratoConductor.findFirst.mockResolvedValue(null);
  });

  it('busca superposiciones de ambas partes y admite períodos contiguos', async () => {
    await service.create(periodo);

    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.contratoConductor.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            OR: [
              { idCamion: periodo.idCamion },
              { idConductor: periodo.idConductor },
            ],
          },
          { OR: [{ fechaFin: null }, { fechaFin: { gt: fechaInicio } }] },
          { fechaInicio: { lt: fechaFin } },
        ],
      },
      select: { idCamion: true },
    });
    expect(tx.contratoConductor.create).toHaveBeenCalled();
  });

  it('rechaza un fin igual al inicio y un período superpuesto', async () => {
    await expect(
      service.create({ ...periodo, fechaFin: periodo.fechaInicio }),
    ).rejects.toBeInstanceOf(BadRequestException);
    tx.contratoConductor.findFirst.mockResolvedValueOnce({
      idCamion: periodo.idCamion,
    });
    await expect(service.create(periodo)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.contratoConductor.create).not.toHaveBeenCalled();
  });

  it('vuelve a comprobar el período al reintentar una escritura concurrente', async () => {
    db.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Conflicto concurrente', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    tx.contratoConductor.findFirst.mockResolvedValueOnce({
      idCamion: periodo.idCamion,
    });

    await expect(service.create(periodo)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.contratoConductor.create).not.toHaveBeenCalled();
  });

  it('excluye solamente el contrato que se está editando', async () => {
    await service.update(periodo, { fechaFin: null });
    expect(tx.contratoConductor.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            OR: [
              { idCamion: periodo.idCamion },
              { idConductor: periodo.idConductor },
            ],
          },
          { OR: [{ fechaFin: null }, { fechaFin: { gt: fechaInicio } }] },
          {},
        ],
        NOT: {
          idCamion: periodo.idCamion,
          idConductor: periodo.idConductor,
          fechaInicio,
        },
      },
      select: { idCamion: true },
    });
  });
});
