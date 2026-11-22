import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { consultarCamionesHoy, consultarTrayectosHoy } from '../src/services/hoyService.ts';

afterEach(() => mock.restoreAll());

test('consulta el trayecto fijo y los camiones por separado con la sesión', async () => {
  const mapa = { domicilio: { lat: -36, long: -62 }, trayectos: [] };
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(mapa));
  const { signal } = new AbortController();

  assert.deepEqual(await consultarTrayectosHoy('domicilio/uno', signal), mapa);
  fetchMock.mock.mockImplementation(async () => Response.json([]));
  assert.deepEqual(await consultarCamionesHoy('domicilio/uno', signal), []);
  const llamadas = fetchMock.mock.calls.map(({ arguments: args }) => args as unknown as [string, RequestInit]);
  assert.deepEqual(llamadas.map(([url]) => url), ['/api/hoy/domicilios/domicilio%2Funo/trayectos', '/api/hoy/domicilios/domicilio%2Funo/camiones']);
  for (const [, opciones] of llamadas) {
    assert.equal(opciones.credentials, 'same-origin');
    assert.equal(opciones.signal, signal);
  }
});
