import { Injectable, NotFoundException } from '@nestjs/common';
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
  }

  async remove(id: string) {
    await this.prisma.tipoPuntoLimpio.delete({ where: { id } });
  }
}
