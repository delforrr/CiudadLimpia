import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoPuntoLimpioService } from '../tipo-punto-limpio/tipo-punto-limpio.service';
import { CreatePuntoLimpioDto } from './dto/create-punto-limpio.dto';
import { puntoLimpioSelect } from './puntos-limpios.select';
import { UpdatePuntoLimpioDto } from './dto/update-punto-limpio.dto';

@Injectable()
export class PuntosLimpiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoPuntoLimpio: TipoPuntoLimpioService,
  ) {}

  async create(dto: CreatePuntoLimpioDto) {
    try {
      return await this.prisma.puntoLimpio.create({
        data: dto,
        select: puntoLimpioSelect,
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async update(id: string, dto: UpdatePuntoLimpioDto) {
    try {
      return await this.prisma.puntoLimpio.update({
        where: { id },
        data: dto,
        select: puntoLimpioSelect,
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async findAll() {
    return await this.prisma.puntoLimpio.findMany({
      select: puntoLimpioSelect,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const punto = await this.prisma.puntoLimpio.findUnique({
      where: { id },
      select: puntoLimpioSelect,
    });
    if (!punto) throw new NotFoundException('Punto limpio no encontrado');
    return punto;
  }

  async remove(id: string) {
    try {
      await this.prisma.puntoLimpio.delete({ where: { id } });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'P2003')
        throw new BadRequestException(
          'El tipo o la dirección indicados no existen',
        );
      if (error.code === 'P2025')
        throw new NotFoundException('Punto limpio no encontrado');
    }
    throw error;
  }
}
