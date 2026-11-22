import type { LineStringDto } from './trayecto.dto';

function posicionValida(posicion: unknown): posicion is [number, number] {
  if (!Array.isArray(posicion) || posicion.length !== 2) return false;
  const [long, lat] = posicion as unknown[];
  return (
    typeof long === 'number' &&
    long >= -180 &&
    long <= 180 &&
    typeof lat === 'number' &&
    lat >= -90 &&
    lat <= 90
  );
}

export function esLineaValida(geometria: unknown): geometria is LineStringDto {
  if (
    !geometria ||
    typeof geometria !== 'object' ||
    !('type' in geometria) ||
    geometria.type !== 'LineString' ||
    !('coordinates' in geometria) ||
    !Array.isArray(geometria.coordinates)
  )
    return false;

  const { coordinates } = geometria;
  if (coordinates.length < 2 || !coordinates.every(posicionValida))
    return false;
  const [[longInicial, latInicial]] = coordinates;
  return coordinates.some(
    ([long, lat]) => long !== longInicial || lat !== latInicial,
  );
}
