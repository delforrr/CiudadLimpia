import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoPuntoLimpioDto } from './dto/create-tipo-punto-limpio.dto';
import { UpdateTipoPuntoLimpioDto } from './dto/update-tipo-punto-limpio.dto';
import {
  tipoPuntoLimpioSelect,
  toTipoPuntoLimpioResponse,
} from './tipo-punto-limpio.select';

@Injectable()
export class TipoPuntoLimpioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTipoPuntoLimpioDto) {
    const { residuos, materiales, ...data } = dto;
    return this.conResiduos(residuos, materiales, async (db, ids) => {
      const tipo = await db.tipoPuntoLimpio.create({
        data: {
          ...data,
          ...(ids?.length && {
            residuos: { create: ids.map((residuoId) => ({ residuoId })) },
          }),
        },
        select: tipoPuntoLimpioSelect,
      });
      return toTipoPuntoLimpioResponse(tipo);
    });
  }

  async findAll() {
    const tipos = await this.prisma.tipoPuntoLimpio.findMany({
      select: tipoPuntoLimpioSelect,
      orderBy: { nombre: 'asc' },
    });
    return tipos.map(toTipoPuntoLimpioResponse);
  }

  async findOne(id: string) {
    const tipo = await this.prisma.tipoPuntoLimpio.findUnique({
      where: { id },
      select: tipoPuntoLimpioSelect,
    });
    if (!tipo)
      throw new NotFoundException('Tipo de punto limpio no encontrado');
    return toTipoPuntoLimpioResponse(tipo);
  }

  async update(id: string, dto: UpdateTipoPuntoLimpioDto) {
    const { residuos, materiales, ...data } = dto;
    return this.conResiduos(residuos, materiales, async (db, ids) => {
      const tipo = await db.tipoPuntoLimpio.update({
        where: { id },
        data: {
          ...data,
          ...(ids !== undefined && {
            residuos: {
              deleteMany: {},
              create: ids.map((residuoId) => ({ residuoId })),
            },
          }),
        },
        select: tipoPuntoLimpioSelect,
      });
      return toTipoPuntoLimpioResponse(tipo);
    });
  }

  private conResiduos<T>(
    residuos: string[] | undefined,
    materiales: string[] | undefined,
    guardar: (db: Prisma.TransactionClient, ids?: string[]) => Promise<T>,
  ) {
    if (materiales === undefined) return guardar(this.prisma, residuos);
    if (residuos !== undefined) {
      throw new BadRequestException('Enviá materiales o residuos, solo uno.');
    }
    const claves = materiales.map((nombre) =>
      nombre
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('es'),
    );
    if (new Set(claves).size !== materiales.length) {
      throw new BadRequestException(
        'No repitas materiales dentro del mismo tipo.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.residuo.createMany({
        data: materiales.map((nombre) => ({ nombre })),
        skipDuplicates: true,
      });
      const registros = await tx.residuo.findMany({
        where: { nombre: { in: materiales } },
        select: { id: true },
      });
      return guardar(
        tx,
        registros.map(({ id }) => id),
      );
    });
  }

  async remove(id: string) {
    await this.prisma.tipoPuntoLimpio.delete({ where: { id } });
  }
}
