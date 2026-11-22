import { proyectarProgreso } from './progreso-trayecto';
import type { PosicionTelemetriaDto } from './telemetria.dto';
import type { LineStringDto } from '../trayecto/trayecto.dto';

const linea: LineStringDto = {
  type: 'LineString',
  coordinates: [
    [-62.74, -36],
    [-62.73, -36],
    [-62.74, -36],
  ],
};
const regreso = (long: number, segundo: number): PosicionTelemetriaDto => ({
  long,
  lat: -36,
  precisionM: 5,
  registradoEn: new Date(segundo * 1000).toISOString(),
  servicioId: '',
  trayectoId: '',
  camionId: '',
});

it('marca un retorno ambiguo sin contexto y usa una posición previa para conocer el avance', () => {
  const actual = regreso(-62.7395, 10);
  expect(proyectarProgreso(actual, linea, null)).toBeNull();
  const anterior = {
    metros: 18,
    posicion: { lat: -36, long: -62.7398 },
    avanza: true,
    registradoEn: new Date(5000),
  };
  expect(proyectarProgreso(actual, linea, anterior)).toMatchObject({
    avanza: true,
  });
  expect(
    proyectarProgreso({ ...actual, lat: -36.001 }, linea, anterior),
  ).toBeNull();
});
