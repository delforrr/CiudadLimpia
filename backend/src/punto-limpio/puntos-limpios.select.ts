import type { Prisma } from '../generated/prisma/client';

export const puntoLimpioSelect = {
  id: true,
  nombre: true,
  tipoId: true,
  direccionId: true,
  direccion: { select: { lat: true, long: true } },
} as const satisfies Prisma.PuntoLimpioSelect;

export function toPuntoLimpioResponse({
  direccion,
  ...punto
}: Prisma.PuntoLimpioGetPayload<{ select: typeof puntoLimpioSelect }>) {
  return { ...punto, ...direccion };
}
