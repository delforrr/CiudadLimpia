import { transaccionConReintento } from '../prisma/transaccion-con-reintento';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  puntosTrayectoArgs,
  toPuntoTrayectoResponse,
} from './puntos-trayecto.select';
import { PuntosTrayectoService } from './puntos-trayecto.service';
import { esLineaValida } from './line-string';
import type {
  CreateTrayectoDto,
  LineStringDto,
  TramoTrayectoDto,
  UpdateTrayectoDto,
} from './trayecto.dto';

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

function validarTramos(geometria: LineStringDto, tramos: TramoTrayectoDto[]) {
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

  return tramosOrdenados;
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

  async update(id: string, dto: UpdateTrayectoDto) {
    return this.guardar(
      dto,
      async (tx, data) => {
        await tx.tramoTrayecto.deleteMany({ where: { trayectoId: id } });
        await tx.puntoTrayecto.deleteMany({ where: { trayectoId: id } });
        return toTrayectoResponse(
          await tx.trayecto.update({
            where: { id },
            data,
            include: trayectoInclude,
          }),
        );
      },
      id,
    );
  }

  async remove(id: string) {
    await this.prisma.trayecto.delete({ where: { id } });
  }

  private async guardar<T>(
    {
      geometria,
      localidadId,
      zonaId,
      nombre,
      puntos,
      tramos,
    }: UpdateTrayectoDto,
    escribir: (
      tx: Prisma.TransactionClient,
      data: Prisma.TrayectoUncheckedCreateInput,
    ) => Promise<T>,
    trayectoId?: string,
  ) {
    if (!esLineaValida(geometria)) {
      throw new BadRequestException(
        'La línea requiere dos posiciones válidas y distintas',
      );
    }

    const ordenados = this.puntosTrayecto.ordenar(puntos);
    const tramosOrdenados = validarTramos(geometria, tramos);

    return transaccionConReintento(
      this.prisma,
      async (tx) => {
        const localidad = await tx.localidad.findUnique({
          where: { id: localidadId },
          select: { id: true },
        });
        if (!localidad)
          throw new BadRequestException('La localidad indicada no existe');

        const zonaElegida =
          zonaId ??
          (trayectoId
            ? (
                await tx.trayecto.findUniqueOrThrow({
                  where: { id: trayectoId },
                  select: { zonaId: true },
                })
              ).zonaId
            : undefined);
        const zona =
          zonaElegida &&
          (await tx.zona.findUnique({
            where: { id_localidadId: { id: zonaElegida, localidadId } },
            select: { id: true },
          }));
        if (!zona)
          throw new BadRequestException(
            'Elegí una zona de la localidad del trayecto',
          );

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
          zonaId: zona.id,
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
