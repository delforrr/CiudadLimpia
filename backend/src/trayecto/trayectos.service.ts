import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { transaccionConDirecciones } from '../direccion/direccion-referencia';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  puntosTrayectoArgs,
  toPuntoTrayectoResponse,
} from '../punto-trayecto/puntos-trayecto.select';
import { PuntosTrayectoService } from '../punto-trayecto/puntos-trayecto.service';
import { esLineaValida } from './line-string';
import type { CreateTrayectoDto, TramoTrayectoDto } from './trayecto.dto';

const trayectoInclude = {
  puntos: puntosTrayectoArgs,
  tramos: {
    orderBy: { desde: 'asc' },
    select: {
      desde: true,
      hasta: true,
      lado: true,
      calleId: true,
      calle: { select: { id: true, calle: true } },
    },
  },
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
      await tx.tramoTrayecto.deleteMany({ where: { trayectoId: id } });
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
    { geometria, localidadId, nombre, puntos, tramos }: CreateTrayectoDto,
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
    const tramosOrdenados = [...tramos].sort((a, b) => a.desde - b.desde);
    const { coordinates } = geometria;
    const hayLongitud = (desde: number, hasta: number) =>
      coordinates
        .slice(desde + 1, hasta + 1)
        .some(
          ([long, lat]) =>
            long !== coordinates[desde][0] || lat !== coordinates[desde][1],
        );
    let fin = 0;
    const errorCobertura =
      'Asigná una calle a toda la línea, sin huecos ni tramos superpuestos.';
    for (const { desde, hasta } of tramosOrdenados) {
      if (
        desde < fin ||
        hasta <= desde ||
        hasta >= coordinates.length ||
        hayLongitud(fin, desde) ||
        !hayLongitud(desde, hasta)
      ) {
        throw new BadRequestException(errorCobertura);
      }
      fin = hasta;
    }
    if (hayLongitud(fin, coordinates.length - 1))
      throw new BadRequestException(errorCobertura);

    return transaccionConDirecciones(
      this.prisma,
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
        const ids = [...new Set(tramosOrdenados.map(({ calleId }) => calleId))];
        const cantidad = await tx.calle.count({ where: { id: { in: ids } } });
        if (cantidad !== ids.length)
          throw new BadRequestException(
            'Una calle asignada al tramo no existe.',
          );

        return escribir(tx, {
          nombre,
          localidadId,
          geometria: {
            type: geometria.type,
            coordinates: geometria.coordinates,
          },
          puntos: { create: referencias },
          tramos: {
            create: tramosOrdenados.map(
              ({ calleId, desde, hasta, lado }: TramoTrayectoDto) => ({
                calleId,
                desde,
                hasta,
                lado,
              }),
            ),
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        // Resolver todos los puntos puede superar 5 s con PostgreSQL remoto.
        timeout: 20_000,
      },
    );
  }
}
