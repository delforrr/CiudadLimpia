import { calcularCobertura, type Recorrido } from './cobertura-trayecto';

const posicion = (x: number, y: number) => ({
  lat: -36 + y / 111195,
  long: -62.7 + x / 89958,
});

function recorrido(
  vertices: [number, number][],
  tramos: Recorrido['tramos'],
): Recorrido {
  return {
    geometria: {
      type: 'LineString',
      coordinates: vertices.map(([x, y]) => {
        const { lat, long } = posicion(x, y);
        return [long, lat];
      }),
    },
    tramos,
  };
}

const frente = (x: number, y: number, calleId = 'roca') => ({
  ...posicion(x, y),
  calleId,
});

describe('cobertura del frente', () => {
  it('distingue un cambio de nombre sin giro y reconoce un nombre anterior documentado', () => {
    const linea = recorrido(
      [
        [0, 0],
        [100, 0],
        [200, 0],
      ],
      [
        { desde: 0, hasta: 1, calleId: 'roca' },
        { desde: 1, hasta: 2, calleId: 'continuacion' },
      ],
    );
    expect(calcularCobertura(frente(150, 3), linea).estado).toBe(
      'SIN_COBERTURA',
    );
    expect(
      calcularCobertura(frente(150, 3, 'continuacion'), linea).estado,
    ).toBe('CUBIERTO');
    expect(
      calcularCobertura(
        {
          ...frente(150, 3, 'nombre-anterior'),
          calle: { calleVigenteId: 'continuacion' },
        },
        linea,
      ).estado,
    ).toBe('CUBIERTO');
  });

  it('respeta el lado de la calzada en el sentido de marcha', () => {
    const tramo = {
      desde: 0,
      hasta: 1,
      calleId: 'roca',
      lado: 'IZQUIERDA',
    } as const;
    const ida = recorrido(
      [
        [0, 0],
        [100, 0],
      ],
      [tramo],
    );
    const vuelta = recorrido(
      [
        [100, 0],
        [0, 0],
      ],
      [tramo],
    );
    expect(calcularCobertura(frente(50, 10), ida).estado).toBe('CUBIERTO');
    expect(calcularCobertura(frente(50, -10), ida).estado).toBe(
      'SIN_COBERTURA',
    );
    expect(calcularCobertura(frente(50, -10), vuelta).estado).toBe('CUBIERTO');
    expect(calcularCobertura(frente(50, 0), vuelta).estado).toBe(
      'SIN_COBERTURA',
    );
  });

  it('conserva los dos pasos de un recorrido de ida y vuelta y la menor distancia al tramo', () => {
    const linea = recorrido(
      [
        [0, 0],
        [100, 0],
        [100, 0],
        [0, 0],
      ],
      [{ desde: 0, hasta: 3, calleId: 'roca' }],
    );
    const cobertura = calcularCobertura(frente(50, 8), linea);
    expect(cobertura.estado).toBe('CUBIERTO');
    if (cobertura.estado !== 'CUBIERTO') return;
    expect(cobertura.pasosEnTrayectoM).toHaveLength(2);
    expect(cobertura.distanciaM).toBeCloseTo(8, 1);
    expect(calcularCobertura(frente(101, 0), linea).estado).toBe(
      'SIN_COBERTURA',
    );
    expect(calcularCobertura(frente(50, 21), linea).estado).toBe(
      'SIN_COBERTURA',
    );
  });
});
