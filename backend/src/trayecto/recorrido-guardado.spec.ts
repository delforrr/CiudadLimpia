import { leerRecorrido } from './recorrido-guardado';

const geometria = {
  type: 'LineString',
  coordinates: [
    [-62.73, -35.97],
    [-62.74, -35.98],
  ],
};

it('conserva prestaciones previas a la cobertura por tramos', () => {
  expect(leerRecorrido({ geometria })).toEqual({ geometria, tramos: [] });
});

it('descarta geometrías y tramos guardados con valores inválidos', () => {
  expect(
    leerRecorrido({ geometria: { ...geometria, coordinates: [] } }),
  ).toBeNull();
  expect(
    leerRecorrido({
      geometria,
      tramos: [{ desde: 0, hasta: 5, calleId: 'calle' }],
    }),
  ).toBeNull();
  expect(
    leerRecorrido({
      geometria,
      tramos: [{ desde: 0, hasta: 1, calleId: 'calle' }],
    }),
  ).toMatchObject({ geometria });
});
