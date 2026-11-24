import type { Prisma } from '../generated/prisma/client';

export const puntoLimpioSelect = {
  id: true,
  nombre: true,
  estado: true,
  tipoId: true,
  direccionId: true,
  direccion: {
    select: {
      lat: true,
      long: true,
      altura: true,
      calle: { select: { calle: true } },
    },
  },
} as const satisfies Prisma.PuntoLimpioSelect;

export function toPuntoLimpioResponse({
  direccion,
  ...punto
}: Prisma.PuntoLimpioGetPayload<{ select: typeof puntoLimpioSelect }>) {
  const { calle, altura, lat, long } = direccion;
  return { ...punto, lat, long, direccion: `${calle.calle} ${altura}` };
}
