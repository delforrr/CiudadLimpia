import {
  direccionSelect,
  toDireccionResponse,
} from '../direccion/direcciones.select';
import type { Prisma } from '../generated/prisma/client';

export const puntosTrayectoArgs = {
  orderBy: { orden: 'asc' },
  select: {
    orden: true,
    direccionId: true,
    direccion: { select: direccionSelect },
  },
} as const satisfies Prisma.Trayecto$puntosArgs;

export const referenciasRecorridoArgs = {
  orderBy: { orden: 'asc' },
  select: {
    orden: true,
    direccion: {
      select: { calleId: true, altura: true, lat: true, long: true },
    },
  },
} as const satisfies Prisma.Trayecto$puntosArgs;

type PuntoTrayectoRecord = Prisma.PuntoTrayectoGetPayload<
  typeof puntosTrayectoArgs
>;

export function toPuntoTrayectoResponse({
  direccion,
  ...punto
}: PuntoTrayectoRecord) {
  return {
    ...punto,
    lat: direccion.lat,
    long: direccion.long,
    direccion: toDireccionResponse(direccion),
  };
}
