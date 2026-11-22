import {
  distanciaM,
  proyectarEnLinea,
  segmentosLinea,
  vectorM,
  type Coordenadas,
  type ProyeccionLinea,
} from './proyeccion-linea';
import type { LineStringDto } from './trayecto.dto';

export type Frente = Coordenadas & { calleId: string; altura: number };
export type ReferenciaTrayecto = Frente & { orden: number };
export type Recorrido = {
  geometria: LineStringDto;
  referencias: readonly ReferenciaTrayecto[];
};
export type CoberturaFrente =
  | { estado: 'CUBIERTO'; pasosEnTrayectoM: number[] }
  | { estado: 'SIN_COBERTURA' | 'DATOS_INSUFICIENTES' };

export function distanciaAlPinMasCercano(frente: Frente, recorrido: Recorrido) {
  return recorrido.referencias.reduce(
    (minima, referencia) => Math.min(minima, distanciaM(frente, referencia)),
    Infinity,
  );
}

const margenM = 0.05;

function dentroDelTramo(metros: number, inicio: number, fin: number) {
  return metros >= inicio - margenM && metros <= fin + margenM;
}

function sigueEntreReferencias(
  segmentos: ReturnType<typeof segmentosLinea>,
  a: ReferenciaTrayecto,
  b: ReferenciaTrayecto,
  inicio: ProyeccionLinea,
  fin: ProyeccionLinea,
) {
  const eje = vectorM(a, b);
  const largo = Math.hypot(eje.x, eje.y);
  if (largo < margenM || fin.metros - inicio.metros < margenM) return false;
  const cercaDelEje = (punto: Coordenadas) => {
    const v = vectorM(a, punto);
    return Math.abs(v.x * eje.y - v.y * eje.x) / largo <= 12;
  };
  return (
    cercaDelEje(inicio.posicion) &&
    cercaDelEje(fin.posicion) &&
    segmentos.every(
      ({ metros, longitud, inicio: desde, fin: hasta, vector }) => {
        if (metros + longitud <= inicio.metros || metros >= fin.metros)
          return true;
        const coseno =
          (vector.x * eje.x + vector.y * eje.y) / (longitud * largo);
        return (
          coseno >= Math.cos(Math.PI / 6) &&
          (metros < inicio.metros || cercaDelEje(desde)) &&
          (metros + longitud > fin.metros || cercaDelEje(hasta))
        );
      },
    )
  );
}

function anclajesOrdenados(
  referencias: ReferenciaTrayecto[],
  linea: LineStringDto,
) {
  const candidatos = referencias.map((ref) =>
    proyectarEnLinea(ref, linea).filter(
      ({ distancia, metros }, indice, proyecciones) => {
        const previo = proyecciones[indice - 1];
        const siguiente = proyecciones[indice + 1];
        return (
          distancia <= 15 &&
          (!previo ||
            (previo.distancia >= distancia && previo.metros !== metros)) &&
          (!siguiente || siguiente.distancia >= distancia)
        );
      },
    ),
  );
  // Solo quedan proyecciones que pueden formar parte de una secuencia completa.
  for (let i = 1; i < candidatos.length; i++) {
    const previo = candidatos[i - 1][0]?.metros ?? Infinity;
    candidatos[i] = candidatos[i].filter(
      ({ metros }) => metros >= previo - margenM,
    );
  }
  for (let i = candidatos.length - 2; i >= 0; i--) {
    const siguiente = candidatos[i + 1].at(-1)?.metros ?? -Infinity;
    candidatos[i] = candidatos[i].filter(
      ({ metros }) => metros <= siguiente + margenM,
    );
  }
  return candidatos;
}

export function calcularCobertura(
  frente: Frente,
  recorrido: Recorrido,
): CoberturaFrente {
  const { geometria } = recorrido;
  const pasos = proyectarEnLinea(frente, geometria).filter(
    ({ dentro, distancia }) => dentro && distancia <= 20,
  );
  if (!pasos.length) return { estado: 'SIN_COBERTURA' };

  const referencias = [...recorrido.referencias].sort(
    (a, b) => a.orden - b.orden,
  );
  const anclajes = anclajesOrdenados(referencias, geometria);
  const segmentos = segmentosLinea(geometria);
  const validezPorTramo = referencias
    .slice(1)
    .map(() => new Map<string, boolean>());
  const confirmados: number[] = [];
  let insuficiente = false;

  for (const paso of pasos) {
    let confirma = false;
    let otraCalle = false;
    let ambiguo = false;
    let limiteSinConfirmar = false;
    evaluarTramos: for (let i = 1; i < referencias.length; i++) {
      const a = referencias[i - 1];
      const b = referencias[i];
      for (const inicio of anclajes[i - 1]) {
        for (const fin of anclajes[i]) {
          if (
            fin.metros - inicio.metros < margenM ||
            !dentroDelTramo(paso.metros, inicio.metros, fin.metros)
          )
            continue;
          const clave = `${inicio.metros}:${fin.metros}`;
          const validez = validezPorTramo[i - 1];
          if (!validez.has(clave)) {
            validez.set(
              clave,
              a.calleId === b.calleId &&
                sigueEntreReferencias(segmentos, a, b, inicio, fin),
            );
          }
          if (!validez.get(clave)) {
            if (
              paso.metros > inicio.metros + margenM &&
              paso.metros < fin.metros - margenM
            ) {
              ambiguo = true;
              break evaluarTramos;
            } else {
              limiteSinConfirmar = true;
            }
          } else if (a.calleId === frente.calleId) {
            confirma = true;
          } else {
            otraCalle = true;
          }
          if (confirma && otraCalle) break evaluarTramos;
        }
      }
    }
    if (confirma && !otraCalle && !ambiguo) {
      if (paso.metros - (confirmados.at(-1) ?? -Infinity) >= margenM) {
        confirmados.push(paso.metros);
      }
    } else if (ambiguo || limiteSinConfirmar || !otraCalle || confirma) {
      insuficiente = true;
    }
  }

  if (confirmados.length)
    return { estado: 'CUBIERTO', pasosEnTrayectoM: confirmados };
  return { estado: insuficiente ? 'DATOS_INSUFICIENTES' : 'SIN_COBERTURA' };
}
