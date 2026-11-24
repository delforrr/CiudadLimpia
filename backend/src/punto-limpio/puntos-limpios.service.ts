import { transaccionConReintento } from '../prisma/transaccion-con-reintento';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  parCoordenadas,
  referenciaConPin,
  resolverDireccion,
} from '../direccion/direccion-referencia';
import { Prisma } from '../generated/prisma/client';
import { Estado } from '../generated/prisma/enums';
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
    return transaccionConReintento(this.prisma, async (tx) => {
      const { id } = await resolverDireccion(tx, referencia);
      const punto = await tx.puntoLimpio.create({
        data: {
          nombre: dto.nombre,
          estado: dto.estado,
          tipoId: dto.tipoId,
          direccionId: id,
        },
        select: puntoLimpioSelect,
      });
      return toPuntoLimpioResponse(punto);
    });
  }

  async update(id: string, dto: UpdatePuntoLimpioDto) {
    const coordenadas = parCoordenadas(dto);
    return transaccionConReintento(
      this.prisma,
      async (tx) => {
        const { nombre, estado, tipoId, direccionId, direccion } = dto;
        let frenteId = direccionId;
        if (direccion) {
          frenteId = (await resolverDireccion(tx, referenciaConPin(dto))).id;
        } else if (direccionId !== undefined || coordenadas) {
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
          data: { nombre, estado, tipoId, direccionId: frenteId },
          select: puntoLimpioSelect,
        });
        return toPuntoLimpioResponse(punto);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findAll(incluirInactivos = false) {
    const puntos = await this.prisma.puntoLimpio.findMany({
      select: puntoLimpioSelect,
      where: incluirInactivos ? undefined : { estado: Estado.ACTIVO },
      orderBy: { nombre: 'asc' },
    });
    return puntos.map(toPuntoLimpioResponse);
  }

  async findOne(id: string) {
    const punto = await this.prisma.puntoLimpio.findUnique({
      where: { id, estado: Estado.ACTIVO },
      select: puntoLimpioSelect,
    });
    if (!punto) throw new NotFoundException('Punto limpio no encontrado');
    return toPuntoLimpioResponse(punto);
  }

  async remove(id: string) {
    await this.prisma.puntoLimpio.delete({ where: { id } });
  }
}
