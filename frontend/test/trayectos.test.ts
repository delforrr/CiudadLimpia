import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { trayectosService, type Trayecto } from '../src/services/trayectosService.ts';
import { abrirBorrador, completarAltura, prepararTrayecto, tienePosicionesDistintas } from '../src/utils/trayectoEditor.ts';
import { reducirBorrador } from '../src/utils/borradorTrayecto.ts';
import { dividirTramo, tramosDeLinea } from '../src/utils/tramosTrayecto.ts';

const origen = { lat: -35.97, long: -62.73 };
const destino = { lat: -35.98, long: -62.74 };
const geometria = { type: 'LineString', coordinates: [[-62.73, -35.97], [-62.73, -35.98], [-62.74, -35.98]] } as const;
const guardado: Trayecto = {
  id: 'recorrido-1', nombre: 'Centro', localidadId: '06826050', zonaId: 'zona-1',
  geometria: { type: geometria.type, coordinates: geometria.coordinates.map(([long, lat]) => [long, lat]) },
  puntos: [
    { ...destino, orden: 1, direccionId: 'pin-2', direccion: { calle: null, altura: null, direccion: 'Pin' } },
    { ...origen, orden: 0, direccionId: 'calle-1', direccion: { calle: 'Villegas', altura: null, direccion: 'Villegas' } },
  ],
};

afterEach(() => mock.restoreAll());

test('edita y envía la calle de un tramo y admite una división sobre la línea sugerida', () => {
  const calle = { id: 'calle-1', calle: 'Villegas' };
  const borrador = abrirBorrador({ ...guardado, tramos: [{ desde: 0, hasta: 1, calleId: calle.id, calle }] });
  const [primero, segundo] = tramosDeLinea(guardado.geometria, borrador);
  assert.deepEqual(primero, { desde: 0, hasta: 1, calle });
  assert.deepEqual(segundo, { desde: 1, hasta: 2, calle: undefined });
  assert.deepEqual(prepararTrayecto(borrador).tramos, [{ desde: 0, hasta: 1, calleId: calle.id }]);
  const corte = dividirTramo(guardado.geometria, segundo, { lat: -35.979, long: -62.735 });
  assert.equal(corte?.indice, 2);
  assert.ok(corte.posicion);
  assert.ok(Math.abs(corte.posicion[0] - (-62.735)) < 1e-9);
  assert.equal(corte.posicion[1], -35.98);
  assert.equal(dividirTramo(guardado.geometria, segundo, destino), undefined);
});

test('permite completar manualmente una calle sin altura y conserva el pin', () => {
  const referencia = { calle: 'Dorrego', altura: null };
  const completada = completarAltura(referencia, ' 860 ');
  assert.deepEqual(completada, { calle: 'Dorrego', altura: 860 });
  assert.equal(referencia.altura, null);
  const envio = prepararTrayecto({ nombre: 'Centro', localidadId: '06826050', zonaId: 'zona-1', lineaElegida: null,
    puntos: [{ clave: '1', ...origen, referencia: completada }, { clave: '2', ...destino }] });
  assert.deepEqual(envio.puntos[0], { ...origen, orden: 0, direccion: { calle: 'Dorrego', altura: 860 } });
});

test('exige una altura manual válida si la referencia de calle no tiene altura', () => {
  const referencia = { calle: 'Dorrego', altura: null };
  for (const valor of ['', ' ', '0', '-1', '1.5', 'abc', '2147483648']) assert.throws(() => completarAltura(referencia, valor));
  assert.equal(completarAltura({ calle: 'Dorrego', altura: 123 }, '860').altura, 123);
});

test('reabre la geometría guardada y conserva referencias al reordenar puntos', () => {
  const borrador = abrirBorrador(guardado);
  assert.equal(borrador.puntos[0].referencia?.altura, null);
  assert.deepEqual(prepararTrayecto(borrador).geometria, guardado.geometria);

  const editado = prepararTrayecto({
    ...borrador,
    lineaElegida: null,
    puntos: [...borrador.puntos].reverse().concat({ clave: 'nuevo', lat: -35.99, long: -62.75 }),
  });
  assert.deepEqual(editado.puntos, [
    { ...destino, orden: 0, direccionId: 'pin-2' },
    { ...origen, orden: 1, direccionId: 'calle-1' },
    { lat: -35.99, long: -62.75, orden: 2 },
  ]);
  assert.deepEqual(editado.geometria.coordinates, [[-62.74, -35.98], [-62.73, -35.97], [-62.75, -35.99]]);
  assert.equal(tienePosicionesDistintas([origen, origen]), false);
  assert.equal(tienePosicionesDistintas([origen, destino]), true);
});

test('envía la geometría elegida y los puntos confirmados al alta o a la edición', async () => {
  const datos = prepararTrayecto(abrirBorrador(guardado));
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(guardado));
  assert.deepEqual(await trayectosService.guardar(datos), guardado);
  assert.deepEqual(await trayectosService.guardar(datos, guardado.id), guardado);

  const llamadas = fetchMock.mock.calls.map(({ arguments: args }) => args as unknown as [string, RequestInit]);
  assert.deepEqual(llamadas.map(([url, opciones]) => [url, opciones.method]), [
    ['/api/trayectos', 'POST'], ['/api/trayectos/recorrido-1', 'PATCH'],
  ]);
  for (const [, opciones] of llamadas) {
    assert.equal(opciones.credentials, 'same-origin');
    assert.deepEqual(JSON.parse(String(opciones.body)), datos);
  }
});

test('consulta el motor con puntos en orden y sin datos del editor', async () => {
  const solicitud = new AbortController();
  mock.method(globalThis, 'fetch', async (url: string, opciones: RequestInit) => {
    assert.equal(url, '/api/trayectos/sugerencia');
    assert.equal(opciones.signal, solicitud.signal);
    assert.deepEqual(JSON.parse(String(opciones.body)), { puntos: [origen, destino] });
    return Response.json({ geometria: guardado.geometria, fuente: 'OSRM' });
  });
  const puntos = [{ ...origen, clave: 'primero' }, { ...destino, clave: 'segundo' }];
  assert.deepEqual((await trayectosService.sugerir(puntos, solicitud.signal)).geometria, guardado.geometria);
});

test('cortar un tramo conserva calle y lado y desplaza los índices', () => {
  const geometria = { type: 'LineString' as const, coordinates: [[-62.73, -35.97], [-62.74, -35.97]] as [number, number][] };
  const calle = { id: 'calle-1', calle: 'Roca' };
  const borrador = {
    nombre: 'Centro', localidadId: '06826050', zonaId: 'zona-1',
    puntos: [], lineaElegida: geometria,
    tramos: [{ desde: 0, hasta: 1, calleId: calle.id, calle, lado: 'IZQUIERDA' as const }],
  };
  const estado = { borrador, revisarCobertura: false };
  const resultado = reducirBorrador(estado, { tipo: 'corte', desde: 0, corte: { indice: 1, posicion: [-62.735, -35.97] } });
  assert.deepEqual(resultado.borrador.tramos, [
    { ...borrador.tramos[0], desde: 0, hasta: 1 },
    { ...borrador.tramos[0], desde: 1, hasta: 2 },
  ]);
  assert.equal(resultado.borrador.lineaElegida?.coordinates.length, 3);
  assert.equal(borrador.lineaElegida.coordinates.length, 2);
  const movido = reducirBorrador(resultado, { tipo: 'puntos', puntos: [] });
  assert.equal(movido.revisarCobertura, true);
  assert.equal(movido.borrador.lineaElegida, null);
  assert.deepEqual(movido.borrador.tramos, []);
  assert.equal(movido.borrador.zonaId, 'zona-1');
});
