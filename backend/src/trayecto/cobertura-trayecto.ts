import { proyectarEnLinea, type Coordenadas } from './proyeccion-linea';
import type { LineStringDto, TramoTrayectoDto } from './trayecto.dto';

type CalleVigente = { calleVigenteId: string | null };

export type Frente = Coordenadas & { calleId: string; calle?: CalleVigente };
type Tramo = TramoTrayectoDto & { calle?: CalleVigente };
export type Recorrido = {
  geometria: LineStringDto;
  tramos: readonly Tramo[];
};

const calleVigenteSelect = { select: { calleVigenteId: true } } as const;
export const frenteCoberturaSelect = {
  calleId: true,
  lat: true,
  long: true,
  calle: calleVigenteSelect,
} as const;
export const tramosRecorridoArgs = {
  orderBy: { desde: 'asc' },
  select: {
    calleId: true,
    desde: true,
    hasta: true,
    lado: true,
    calle: calleVigenteSelect,
  },
} as const;

export type CoberturaFrente =
  | { estado: 'CUBIERTO'; pasosEnTrayectoM: number[]; distanciaM: number }
  | { estado: 'SIN_COBERTURA' };

const margenM = 0.05;

export function calcularCobertura(
  frente: Frente,
  recorrido: Recorrido,
): CoberturaFrente {
  // Las prestaciones guardadas antes de la asignación por tramo podían omitir tramos.
  const tramosPorSegmento = new Map<number, Tramo>();
  for (const tramo of recorrido.tramos ?? []) {
    for (let indice = tramo.desde; indice < tramo.hasta; indice++) {
      tramosPorSegmento.set(indice, tramo);
    }
  }
  const calleFrente = frente.calle?.calleVigenteId ?? frente.calleId;
  const pasosEnTrayectoM: number[] = [];
  let distanciaM = Infinity;
  for (const {
    indice,
    dentro,
    distancia,
    metros,
    lateralM,
  } of proyectarEnLinea(frente, recorrido.geometria)) {
    const tramo = tramosPorSegmento.get(indice);
    if (
      !dentro ||
      distancia > 20 ||
      !tramo ||
      (tramo.calle?.calleVigenteId ?? tramo.calleId) !== calleFrente
    )
      continue;
    if (
      (tramo.lado === 'IZQUIERDA' && lateralM <= margenM) ||
      (tramo.lado === 'DERECHA' && lateralM >= -margenM)
    )
      continue;
    distanciaM = Math.min(distanciaM, distancia);
    if (metros - (pasosEnTrayectoM.at(-1) ?? -Infinity) >= margenM)
      pasosEnTrayectoM.push(metros);
  }
  return pasosEnTrayectoM.length
    ? { estado: 'CUBIERTO', pasosEnTrayectoM, distanciaM }
    : { estado: 'SIN_COBERTURA' };
}
