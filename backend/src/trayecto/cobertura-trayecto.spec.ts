import {
  calcularCobertura,
  distanciaAlPinMasCercano,
} from './cobertura-trayecto';
import type { Recorrido } from './cobertura-trayecto';

const metrosLat = 111195;
const metrosLong = metrosLat * Math.cos((-36 * Math.PI) / 180);
const posicion = (x: number, y: number) => ({
  lat: -36 + y / metrosLat,
  long: -62.7 + x / metrosLong,
});
const frente = (x: number, y: number, calleId = 'roca') => ({
  ...posicion(x, y),
  calleId,
  altura: 850,
});

function recorrido(
  vertices: [number, number][],
  calleId = 'roca',
  pines = vertices,
): Recorrido {
  return {
    geometria: {
      type: 'LineString',
      coordinates: vertices.map(([x, y]) => {
        const { lat, long } = posicion(x, y);
        return [long, lat];
      }),
    },
    referencias: pines.map(([x, y], orden) => ({
      ...frente(x, y, calleId),
      orden,
    })),
  };
}

describe('cobertura del frente', () => {
  it('incluye el extremo confirmado aunque el tramo siguiente gire a otra calle', () => {
    const giro = recorrido([
      [0, 0],
      [100, 0],
      [100, 100],
    ]);
    const referencias = giro.referencias.map((ref) =>
      ref.orden < 2 ? ref : { ...ref, calleId: 'pincen' },
    );
    expect(
      calcularCobertura(frente(100, 0), { ...giro, referencias }).estado,
    ).toBe('CUBIERTO');
  });
  const recta = recorrido([
    [0, 0],
    [1000, 0],
  ]);

  it('cubre la quinta cuadra aunque un pin de otro trayecto esté más cerca', () => {
    const casa = frente(500, 8);
    const transversal = recorrido(
      [
        [502, 6],
        [502, 110],
      ],
      'pincen',
    );
    expect(distanciaAlPinMasCercano(casa, transversal)).toBeLessThan(
      distanciaAlPinMasCercano(casa, recta),
    );
    expect(calcularCobertura(casa, transversal)).toEqual({
      estado: 'SIN_COBERTURA',
    });
    const resultado = calcularCobertura(casa, recta);
    expect(resultado.estado).toBe('CUBIERTO');
    if (resultado.estado === 'CUBIERTO')
      expect(resultado.pasosEnTrayectoM[0]).toBeCloseTo(500, 1);
  });

  it('excluye una paralela identificada y un frente después del extremo', () => {
    expect(
      calcularCobertura(
        frente(500, 3),
        recorrido(
          [
            [0, 10],
            [1000, 10],
          ],
          'mitre',
        ),
      ).estado,
    ).toBe('SIN_COBERTURA');
    expect(calcularCobertura(frente(990, 3), recta).estado).toBe('CUBIERTO');
    expect(calcularCobertura(frente(1010, 3), recta).estado).toBe(
      'SIN_COBERTURA',
    );
  });

  it('clasifica un desvío sin referencias suficientes y conserva los dos pasos de un retorno', () => {
    const desvio = recorrido(
      [
        [0, 0],
        [400, 0],
        [400, 30],
        [600, 30],
        [600, 0],
        [1000, 0],
      ],
      'roca',
      [
        [0, 0],
        [1000, 0],
      ],
    );
    expect(calcularCobertura(frente(500, 15), desvio).estado).toBe(
      'DATOS_INSUFICIENTES',
    );
    const regreso = recorrido([
      [0, 0],
      [1000, 0],
      [0, 0],
    ]);
    const resultado = calcularCobertura(frente(500, 3), regreso);
    expect(resultado.estado).toBe('CUBIERTO');
    if (resultado.estado === 'CUBIERTO')
      expect(resultado.pasosEnTrayectoM).toHaveLength(2);
  });

  it('conserva todas las coincidencias y el extremo inequívoco', () => {
    for (const linea of [
      recta,
      recorrido(
        [
          [0, 0],
          [300, 0],
          [1000, 0],
        ],
        'roca',
        [
          [0, 0],
          [1000, 0],
        ],
      ),
    ]) {
      expect(calcularCobertura(frente(1000, 0), linea).estado).toBe('CUBIERTO');
    }
  });
});
