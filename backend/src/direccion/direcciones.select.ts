import type { Prisma } from '../generated/prisma/client';

export const direccionSelect = {
  id: true,
  direccion: true,
  calle: { select: { calle: true } },
  altura: true,
  lat: true,
  long: true,
} satisfies Prisma.DireccionSelect;

type DireccionRecord = Prisma.DireccionGetPayload<{
  select: typeof direccionSelect;
}>;

export function toDireccionResponse({
  calle,
  direccion,
  ...registro
}: DireccionRecord) {
  return {
    ...registro,
    calle: calle?.calle ?? null,
    direccion:
      direccion ??
      (calle
        ? [calle.calle, registro.altura]
            .filter((parte) => parte !== null)
            .join(' ')
        : `${registro.lat}, ${registro.long}`),
  };
}
