import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    const { residuos, ...data } = dto;
    try {
      const tipo = await this.prisma.tipoPuntoLimpio.create({
        data: {
          ...data,
          ...(residuos?.length
            ? {
                residuos: {
                  create: residuos.map((residuoId) => ({ residuoId })),
                },
              }
            : {}),
        },
        select: tipoPuntoLimpioSelect,
      });
      return toTipoPuntoLimpioResponse(tipo);
    } catch (error: unknown) {
      this.rethrow(error);
    }
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
    const { residuos, ...data } = dto;
    try {
      const tipo = await this.prisma.tipoPuntoLimpio.update({
        where: { id },
        data: {
          ...data,
          ...(residuos !== undefined
            ? {
                residuos: {
                  deleteMany: {},
                  create: residuos.map((residuoId) => ({ residuoId })),
                },
              }
            : {}),
        },
        select: tipoPuntoLimpioSelect,
      });
      return toTipoPuntoLimpioResponse(tipo);
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.tipoPuntoLimpio.delete({ where: { id } });
    } catch (error: unknown) {
      this.rethrow(error, 'El tipo de punto limpio está en uso');
    }
  }

  private rethrow(error: unknown, relationMessage?: string): never {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'P2002')
        throw new ConflictException(
          'Ya existe un tipo de punto limpio con ese nombre',
        );
      if (error.code === 'P2003') {
        if (relationMessage) throw new ConflictException(relationMessage);
        throw new BadRequestException(
          'Alguno de los residuos indicados no existe',
        );
      }
      if (error.code === 'P2025')
        throw new NotFoundException('Tipo de punto limpio no encontrado');
    }
    throw error;
  }
}
