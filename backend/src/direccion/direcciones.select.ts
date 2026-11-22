import type { Prisma } from '../generated/prisma/client';

export const direccionSelect = {
  id: true,
  calle: { select: { calle: true } },
  altura: true,
  lat: true,
  long: true,
} satisfies Prisma.DireccionSelect;

export type DireccionResuelta = Prisma.DireccionGetPayload<{
  select: typeof direccionSelect;
}>;

export function toDireccionResponse({ calle, ...registro }: DireccionResuelta) {
  return {
    ...registro,
    calle: calle.calle,
    direccion: `${calle.calle} ${registro.altura}`,
  };
}
