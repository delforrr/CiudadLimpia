import type { CalleCatalogo, Coordenadas, LadoRecoleccion, LineaTrayecto } from '../services/trayectosService.ts';
import type { BorradorTrayecto, PuntoEditor } from './trayectoEditor.ts';

export type TramoEditor = { desde: number; hasta: number; calle?: CalleCatalogo; lado?: LadoRecoleccion };

const escalaLongitud = Math.cos(36 * Math.PI / 180);
const distancia = ([long, lat]: [number, number], punto: Coordenadas) =>
  Math.hypot((long - punto.long) * escalaLongitud, lat - punto.lat) * 111195;

export function referenciaEnVertice(linea: LineaTrayecto, indice: number, puntos: PuntoEditor[]) {
  return puntos.find((punto) => distancia(linea.coordinates[indice], punto) < 1)?.referencia;
}

export function tramosDeLinea(linea: LineaTrayecto, borrador: BorradorTrayecto): TramoEditor[] {
  if (linea.coordinates.length < 2) return [];
  const ultimo = linea.coordinates.length - 1;
  const confirmados = borrador.tramos ?? [];
  const cortes = new Set([0, ultimo, ...(borrador.cortes ?? [])]);
  for (const { desde, hasta } of confirmados) {
    cortes.add(desde);
    cortes.add(hasta);
  }
  let anterior = 0;
  for (const punto of borrador.cortes ? [] : borrador.puntos.slice(1, -1)) {
    let mejor = 15;
    let indice = -1;
    for (let i = anterior + 1; i < ultimo; i++) {
      const metros = distancia(linea.coordinates[i], punto);
      if (metros < mejor) {
        mejor = metros;
        indice = i;
      }
    }
    if (indice === -1) continue;
    anterior = indice;
    if (!confirmados.some(({ desde, hasta }) => desde < indice && indice < hasta)) cortes.add(indice);
  }
  const ordenados = [...cortes].sort((a, b) => a - b);
  return ordenados.slice(1).flatMap((hasta, i) => {
    const desde = ordenados[i];
    if (!linea.coordinates.slice(desde + 1, hasta + 1).some(([long, lat]) =>
      long !== linea.coordinates[desde][0] || lat !== linea.coordinates[desde][1])) return [];
    const confirmado = confirmados.find((tramo) => tramo.desde === desde);
    return [{ desde, hasta, calle: confirmado?.calle, ...(confirmado?.lado && { lado: confirmado.lado }) }];
  });
}

export function dividirTramo(linea: LineaTrayecto, tramo: TramoEditor, punto: Coordenadas) {
  const coordinates = linea.coordinates;
  let corte: { indice: number; posicion?: [number, number] } | undefined;
  let mejor = Infinity;
  for (let i = tramo.desde; i < tramo.hasta; i++) {
    const [long, lat] = coordinates[i];
    const [longFinal, latFinal] = coordinates[i + 1];
    const x = (longFinal - long) * escalaLongitud;
    const y = latFinal - lat;
    if (x === 0 && y === 0) continue;
    const fraccion = Math.max(0, Math.min(1, ((punto.long - long) * escalaLongitud * x + (punto.lat - lat) * y) / (x * x + y * y)));
    const posicion: [number, number] = [long + fraccion * (longFinal - long), lat + fraccion * y];
    const metros = distancia(posicion, punto);
    if (metros >= mejor) continue;
    mejor = metros;
    corte = fraccion === 0 ? { indice: i } : fraccion === 1 ? { indice: i + 1 } : { indice: i + 1, posicion };
  }
  if (!corte || (!corte.posicion && (corte.indice === tramo.desde || corte.indice === tramo.hasta))) return;
  return corte;
}
