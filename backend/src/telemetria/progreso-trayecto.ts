import {
  distanciaM,
  proyectarEnLinea,
  type Coordenadas,
} from '../trayecto/proyeccion-linea';
import type { LineStringDto } from '../trayecto/trayecto.dto';
import type { PosicionTelemetriaDto } from './telemetria.dto';
import { z } from 'zod';

export type ProgresoTrayecto = {
  metros: number;
  registradoEn: Date;
  posicion: Coordenadas;
  avanza: boolean;
};

export function proyectarProgreso(
  muestra: PosicionTelemetriaDto,
  linea: LineStringDto,
  anterior: ProgresoTrayecto | null,
): ProgresoTrayecto | null {
  const registradoEn = new Date(muestra.registradoEn);
  const segundos = anterior
    ? (registradoEn.getTime() - anterior.registradoEn.getTime()) / 1000
    : 0;
  const reciente = anterior && segundos > 0 && segundos <= 30 ? anterior : null;
  const candidatos = proyectarEnLinea(muestra, linea)
    .filter(({ distancia, dentro }) => dentro && distancia <= 25)
    .filter(
      ({ metros }) =>
        !reciente || Math.abs(metros - reciente.metros) <= 20 * segundos + 15,
    )
    .sort((a, b) => a.distancia - b.distancia);
  const elegido = candidatos[0];
  if (
    !elegido ||
    candidatos.some(
      ({ metros, distancia }) =>
        Math.abs(metros - elegido.metros) > 5 &&
        distancia - elegido.distancia <= 5,
    )
  )
    return null;

  const { lat, long } = muestra;
  const avance = reciente ? elegido.metros - reciente.metros : 0;
  return {
    metros: elegido.metros,
    registradoEn,
    posicion: { lat, long },
    // Exigir desplazamiento real además de la diferencia entre proyecciones.
    avanza:
      reciente !== null &&
      avance >= 5 &&
      distanciaM(reciente.posicion, muestra) >= 5,
  };
}

const progresoSchema = z.object({
  metros: z.number().nonnegative(),
  registradoEn: z.iso.datetime().transform((fecha) => new Date(fecha)),
  posicion: z.object({
    lat: z.number().min(-90).max(90),
    long: z.number().min(-180).max(180),
  }),
  avanza: z.boolean(),
});

export function leerProgreso(progreso: unknown): ProgresoTrayecto | null {
  const resultado = progresoSchema.safeParse(progreso);
  return resultado.success ? resultado.data : null;
}
