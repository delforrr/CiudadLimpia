import {
  direccionSelect,
  toDireccionResponse,
} from '../direccion/direcciones.select';
import type { Prisma } from '../generated/prisma/client';

export const puntosTrayectoArgs = {
  orderBy: { orden: 'asc' },
  select: {
    orden: true,
    lat: true,
    long: true,
    direccionId: true,
    direccion: { select: direccionSelect },
  },
} as const satisfies Prisma.Trayecto$puntosArgs;

type PuntoTrayectoRecord = Prisma.PuntoTrayectoGetPayload<
  typeof puntosTrayectoArgs
>;

export function toPuntoTrayectoResponse({
  direccion,
  ...punto
}: PuntoTrayectoRecord) {
  return { ...punto, direccion: toDireccionResponse(direccion) };
}
