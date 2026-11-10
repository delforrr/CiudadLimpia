import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DireccionesService } from '../direccion/direcciones.service';
import {
  direccionSelect,
  toDireccionResponse,
} from '../direccion/direcciones.select';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { esLineaValida } from './line-string';
import type { CreateTrayectoDto } from './trayecto.dto';

const trayectoInclude = {
  puntos: {
    orderBy: { orden: 'asc' },
    select: {
      orden: true,
      lat: true,
      long: true,
      direccionId: true,
      direccion: { select: direccionSelect },
    },
  },
} as const satisfies Prisma.TrayectoInclude;

function toTrayectoResponse(
  trayecto: Prisma.TrayectoGetPayload<{ include: typeof trayectoInclude }>,
) {
  return {
    ...trayecto,
    puntos: trayecto.puntos.map(({ direccion, ...punto }) => ({
      ...punto,
      direccion: toDireccionResponse(direccion),
    })),
  };
}

@Injectable()
export class TrayectosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly direcciones: DireccionesService,
  ) {}

  async findAll() {
    // Cada respuesta debe leer la línea y los puntos de la misma versión.
    const trayectos = await this.prisma.$transaction(
      (tx) =>
        tx.trayecto.findMany({
          include: trayectoInclude,
          orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return trayectos.map(toTrayectoResponse);
  }

  async findOne(id: string) {
    const trayecto = await this.prisma.$transaction(
      (tx) =>
        tx.trayecto.findUnique({ where: { id }, include: trayectoInclude }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    if (!trayecto) throw new NotFoundException('Trayecto no encontrado');
    return toTrayectoResponse(trayecto);
  }

  async create(dto: CreateTrayectoDto) {
    return this.guardar(dto, async (tx, data) =>
      toTrayectoResponse(
        await tx.trayecto.create({ data, include: trayectoInclude }),
      ),
    );
  }

  async update(id: string, dto: CreateTrayectoDto) {
    return this.guardar(dto, async (tx, data) => {
      await tx.puntoTrayecto.deleteMany({ where: { trayectoId: id } });
      return toTrayectoResponse(
        await tx.trayecto.update({
          where: { id },
          data,
          include: trayectoInclude,
        }),
      );
    });
  }

  private async guardar<T>(
    { geometria, localidadId, nombre, puntos }: CreateTrayectoDto,
    escribir: (
      tx: Prisma.TransactionClient,
      data: Prisma.TrayectoUncheckedCreateInput,
    ) => Promise<T>,
  ) {
    if (!esLineaValida(geometria)) {
      throw new BadRequestException(
        'La línea requiere dos posiciones válidas y distintas',
      );
    }

    const ordenados = [...puntos].sort((a, b) => a.orden - b.orden);
    if (ordenados.some((punto, indice) => punto.orden !== indice)) {
      throw new BadRequestException(
        'El orden de puntos debe empezar en cero y ser consecutivo',
      );
    }

    for (const punto of ordenados) {
      if (punto.direccion && punto.direccionId) {
        throw new BadRequestException(
          'Enviá direccionId o direccion, solo uno',
        );
      }
    }

    for (let intento = 0; ; intento++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const localidad = await tx.localidad.findUnique({
              where: { id: localidadId },
              select: { id: true },
            });
            if (!localidad)
              throw new BadRequestException('La localidad indicada no existe');

            const referencias: Prisma.PuntoTrayectoUncheckedCreateWithoutTrayectoInput[] =
              [];
            for (const {
              orden,
              lat,
              long,
              direccion,
              direccionId,
            } of ordenados) {
              const referencia = await this.direcciones.resolveForTrayecto(tx, {
                lat,
                long,
                direccion,
                direccionId,
              });
              referencias.push({
                orden,
                lat,
                long,
                direccionId: referencia.id,
              });
            }

            return escribir(tx, {
              nombre,
              localidadId,
              geometria: {
                type: geometria.type,
                coordinates: geometria.coordinates,
              },
              puntos: { create: referencias },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError))
          throw error;
        if (error.code === 'P2025')
          throw new NotFoundException('Trayecto no encontrado');
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'La localidad o la dirección indicadas no existen',
          );
        }
        // Una escritura concurrente puede invalidar la búsqueda de un pin.
        if (error.code !== 'P2034') throw error;
        if (intento >= 2) {
          throw new ConflictException(
            'Cambió el trayecto o una referencia. Volvé a intentar.',
          );
        }
      }
    }
  }
}
