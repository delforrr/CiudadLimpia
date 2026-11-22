import type { LineStringDto } from './trayecto.dto';

export type Coordenadas = { lat: number; long: number };
export type ProyeccionLinea = {
  metros: number;
  distancia: number;
  dentro: boolean;
  posicion: Coordenadas;
};

const metrosPorGrado = (Math.PI * 6371008.8) / 180;

export function vectorM(a: Coordenadas, b: Coordenadas) {
  const latitud = ((a.lat + b.lat) * Math.PI) / 360;
  return {
    x: (b.long - a.long) * metrosPorGrado * Math.cos(latitud),
    y: (b.lat - a.lat) * metrosPorGrado,
  };
}

export function distanciaM(a: Coordenadas, b: Coordenadas): number {
  const { x, y } = vectorM(a, b);
  return Math.hypot(x, y);
}

export function segmentosLinea(linea: LineStringDto) {
  let metros = 0;
  const segmentos: {
    inicio: Coordenadas;
    fin: Coordenadas;
    vector: ReturnType<typeof vectorM>;
    longitud: number;
    metros: number;
  }[] = [];
  for (let i = 1; i < linea.coordinates.length; i++) {
    const [longA, latA] = linea.coordinates[i - 1];
    const [longB, latB] = linea.coordinates[i];
    const inicio = { lat: latA, long: longA };
    const fin = { lat: latB, long: longB };
    const vector = vectorM(inicio, fin);
    const longitud = Math.hypot(vector.x, vector.y);
    if (longitud === 0) continue;
    segmentos.push({ inicio, fin, vector, longitud, metros });
    metros += longitud;
  }
  return segmentos;
}

export function proyectarEnLinea(
  punto: Coordenadas,
  linea: LineStringDto,
): ProyeccionLinea[] {
  return segmentosLinea(linea).map(
    ({ inicio, fin, vector, longitud, metros }) => {
      const { x, y } = vectorM(inicio, punto);
      const fraccion = (x * vector.x + y * vector.y) / longitud ** 2;
      const recorte = Math.max(0, Math.min(1, fraccion));
      const posicion = {
        lat: inicio.lat + recorte * (fin.lat - inicio.lat),
        long: inicio.long + recorte * (fin.long - inicio.long),
      };
      return {
        metros: metros + recorte * longitud,
        distancia: distanciaM(punto, posicion),
        dentro: fraccion >= -1e-6 && fraccion <= 1 + 1e-6,
        posicion,
      };
    },
  );
}
