import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DireccionesService } from '../direccion/direcciones.service';
import { CreatePuntoLimpioDto } from './dto/create-punto-limpio.dto';
import { puntoLimpioSelect } from './puntos-limpios.select';
import { UpdatePuntoLimpioDto } from './dto/update-punto-limpio.dto';

@Injectable()
export class PuntosLimpiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly direcciones: DireccionesService,
  ) {}

  async create({ direccionId, direccion, ...punto }: CreatePuntoLimpioDto) {
    if (direccion) {
      if (direccionId)
        throw new BadRequestException(
          'Enviá direccionId o direccion, solo uno',
        );
      return this.prisma.$transaction(async (tx) => {
        const { id } = await this.direcciones.resolveForPuntoLimpio(
          tx,
          direccion,
        );
        return tx.puntoLimpio.create({
          data: { ...punto, direccionId: id },
          select: puntoLimpioSelect,
        });
      });
    }
    if (!direccionId) throw new BadRequestException('Indicá una dirección');
    await this.assertPublicAddress(direccionId);
    return this.prisma.puntoLimpio.create({
      data: { ...punto, direccionId },
      select: puntoLimpioSelect,
    });
  }

  async update(id: string, dto: UpdatePuntoLimpioDto) {
    if (dto.direccionId) await this.assertPublicAddress(dto.direccionId);
    return this.prisma.puntoLimpio.update({
      where: { id },
      data: dto,
      select: puntoLimpioSelect,
    });
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
    await this.prisma.puntoLimpio.delete({ where: { id } });
  }

  private async assertPublicAddress(id: string) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id, clienteId: null },
      select: { id: true },
    });
    if (!direccion)
      throw new BadRequestException('La dirección indicada no existe');
  }
}
