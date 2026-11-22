import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  puntosTrayectoArgs,
  toPuntoTrayectoResponse,
} from '../punto-trayecto/puntos-trayecto.select';
import { PuntosTrayectoService } from '../punto-trayecto/puntos-trayecto.service';
import { esLineaValida } from './line-string';
import type { CreateTrayectoDto } from './trayecto.dto';

const trayectoInclude = {
  puntos: puntosTrayectoArgs,
} as const satisfies Prisma.TrayectoInclude;

function toTrayectoResponse(
  trayecto: Prisma.TrayectoGetPayload<{ include: typeof trayectoInclude }>,
) {
  return {
    ...trayecto,
    puntos: trayecto.puntos.map(toPuntoTrayectoResponse),
  };
}

@Injectable()
export class TrayectosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly puntosTrayecto: PuntosTrayectoService,
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
      await this.puntosTrayecto.eliminarDeTrayecto(tx, id);
      return toTrayectoResponse(
        await tx.trayecto.update({
          where: { id },
          data,
          include: trayectoInclude,
        }),
      );
    });
  }

  async remove(id: string) {
    await this.prisma.trayecto.delete({ where: { id } });
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

    const ordenados = this.puntosTrayecto.ordenar(puntos);

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

            const referencias = await this.puntosTrayecto.resolverReferencias(
              tx,
              ordenados,
            );

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
