import { Injectable, NotFoundException } from '@nestjs/common';
import {
  parCoordenadas,
  referenciaConPin,
  resolverDireccion,
  transaccionConDirecciones,
} from '../direccion/direccion-referencia';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePuntoLimpioDto } from './dto/create-punto-limpio.dto';
import type { UpdatePuntoLimpioDto } from './dto/update-punto-limpio.dto';
import {
  puntoLimpioSelect,
  toPuntoLimpioResponse,
} from './puntos-limpios.select';

@Injectable()
export class PuntosLimpiosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePuntoLimpioDto) {
    const referencia = referenciaConPin(dto);
    return transaccionConDirecciones(this.prisma, async (tx) => {
      const { id } = await resolverDireccion(tx, referencia);
      const punto = await tx.puntoLimpio.create({
        data: { nombre: dto.nombre, tipoId: dto.tipoId, direccionId: id },
        select: puntoLimpioSelect,
      });
      return toPuntoLimpioResponse(punto);
    });
  }

  async update(id: string, dto: UpdatePuntoLimpioDto) {
    const coordenadas = parCoordenadas(dto);
    return transaccionConDirecciones(
      this.prisma,
      async (tx) => {
        const { nombre, tipoId, direccionId } = dto;
        if (direccionId !== undefined || coordenadas) {
          const referencia =
            direccionId ??
            (
              await tx.puntoLimpio.findUniqueOrThrow({
                where: { id },
                select: { direccionId: true },
              })
            ).direccionId;
          await resolverDireccion(tx, { direccionId: referencia, coordenadas });
        }
        const punto = await tx.puntoLimpio.update({
          where: { id },
          data: { nombre, tipoId, direccionId },
          select: puntoLimpioSelect,
        });
        return toPuntoLimpioResponse(punto);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findAll() {
    const puntos = await this.prisma.puntoLimpio.findMany({
      select: puntoLimpioSelect,
      orderBy: { nombre: 'asc' },
    });
    return puntos.map(toPuntoLimpioResponse);
  }

  async findOne(id: string) {
    const punto = await this.prisma.puntoLimpio.findUnique({
      where: { id },
      select: puntoLimpioSelect,
    });
    if (!punto) throw new NotFoundException('Punto limpio no encontrado');
    return toPuntoLimpioResponse(punto);
  }

  async remove(id: string) {
    await this.prisma.puntoLimpio.delete({ where: { id } });
  }
}
