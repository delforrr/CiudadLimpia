import { BadRequestException, ConflictException } from '@nestjs/common';
import { claveCalle } from '../calle/calle.dto';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import {
  direccionSelect,
  toDireccionResponse,
  type DireccionResuelta,
} from './direcciones.select';
import type {
  CoordenadasDireccionDto,
  CreateDireccionDto,
} from './dto/create-direccion.dto';

// Admite redondeos de representación del pin sin cambiar su posición guardada.
const toleranciaCoordenada = 1e-12;

export type ReferenciaDireccion =
  | { direccionId: string; coordenadas?: CoordenadasDireccionDto }
  | { direccion: CreateDireccionDto };

export function parCoordenadas({
  lat,
  long,
}: Partial<CoordenadasDireccionDto>) {
  if (lat === undefined && long === undefined) return undefined;
  if (lat === undefined || long === undefined) {
    throw new BadRequestException('Enviá lat y long juntas');
  }
  return { lat, long };
}

export function referenciaConPin(
  dto: Partial<CoordenadasDireccionDto> & {
    direccionId?: string;
    direccion?: Pick<CreateDireccionDto, 'calle' | 'altura'>;
  },
): ReferenciaDireccion {
  const { direccion, direccionId } = dto;
  if ((direccion === undefined) === (direccionId === undefined)) {
    throw new BadRequestException('Enviá direccionId o direccion, solo uno');
  }
  const coordenadas = parCoordenadas(dto);
  if (direccionId !== undefined) return { direccionId, coordenadas };
  if (!direccion || !coordenadas) {
    throw new BadRequestException(
      'Enviá lat y long para registrar la dirección',
    );
  }
  return { direccion: { ...direccion, ...coordenadas } };
}

export async function resolverCalleId(
  tx: Prisma.TransactionClient,
  calle: string,
) {
  const clave = claveCalle(calle);
  const registro = await tx.calle.upsert({
    where: { clave },
    create: { clave, calle },
    update: { clave },
    select: { id: true },
  });
  return registro.id;
}

export async function resolverDireccion(
  tx: Prisma.TransactionClient,
  referencia: ReferenciaDireccion,
): Promise<DireccionResuelta> {
  let registro: DireccionResuelta | null;
  let coordenadas: CoordenadasDireccionDto | undefined;

  if ('direccionId' in referencia) {
    coordenadas = referencia.coordenadas;
    registro = await tx.direccion.findUnique({
      where: { id: referencia.direccionId },
      select: direccionSelect,
    });
    if (!registro)
      throw new BadRequestException('La dirección indicada no existe');
  } else {
    const { calle, altura, lat, long } = referencia.direccion;
    const calleId = await resolverCalleId(tx, calle);
    const where = { calleId_altura: { calleId, altura } };
    coordenadas = { lat, long };
    await tx.direccion.createMany({
      data: { calleId, altura, ...coordenadas },
      skipDuplicates: true,
    });
    registro = await tx.direccion.findUniqueOrThrow({
      where,
      select: direccionSelect,
    });
  }

  if (
    coordenadas &&
    (Math.abs(registro.lat - coordenadas.lat) > toleranciaCoordenada ||
      Math.abs(registro.long - coordenadas.long) > toleranciaCoordenada)
  ) {
    throw new ConflictException({
      statusCode: 409,
      code: 'PIN_DIRECCION_DISTINTO',
      message: 'El pin enviado difiere del pin guardado para esta dirección',
      direccion: toDireccionResponse(registro),
    });
  }
  return registro;
}

export async function transaccionConDirecciones<T>(
  prisma: PrismaService,
  guardar: (tx: Prisma.TransactionClient) => Promise<T>,
  isolationLevel?: Prisma.TransactionIsolationLevel,
): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await prisma.$transaction(guardar, { isolationLevel });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034'
      ) {
        throw error;
      }
      if (intento >= 2) {
        throw new ConflictException(
          'Cambió una referencia o el recurso. Volvé a intentar.',
        );
      }
    }
  }
}
