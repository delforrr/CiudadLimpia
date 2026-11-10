import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { trayectosService, type Trayecto } from '../src/services/trayectosService.ts';
import { abrirBorrador, prepararTrayecto, tienePosicionesDistintas } from '../src/utils/trayectoEditor.ts';

const origen = { lat: -35.97, long: -62.73 };
const destino = { lat: -35.98, long: -62.74 };
const geometria = { type: 'LineString', coordinates: [[-62.73, -35.97], [-62.73, -35.98], [-62.74, -35.98]] } as const;
const guardado: Trayecto = {
  id: 'recorrido-1', nombre: 'Centro', localidadId: '06826050',
  geometria: { type: geometria.type, coordinates: geometria.coordinates.map(([long, lat]) => [long, lat]) },
  puntos: [
    { ...destino, orden: 1, direccionId: 'pin-2', direccion: { calle: null, altura: null, direccion: 'Pin' } },
    { ...origen, orden: 0, direccionId: 'calle-1', direccion: { calle: 'Villegas', altura: null, direccion: 'Villegas' } },
  ],
};

afterEach(() => mock.restoreAll());

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
