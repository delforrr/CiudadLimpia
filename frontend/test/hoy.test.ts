import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { consultarMapaHoy } from '../src/services/hoyService.ts';

afterEach(() => mock.restoreAll());

test('consulta el mapa del domicilio con la sesión y propaga la cancelación', async () => {
  const mapa = { domicilio: { lat: -36, long: -62 }, trayectos: [], camiones: [] };
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(mapa));
  const { signal } = new AbortController();

  assert.deepEqual(await consultarMapaHoy('domicilio/uno', signal), mapa);
  const [url, opciones] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, '/api/hoy/domicilios/domicilio%2Funo/mapa');
  assert.equal(opciones.credentials, 'same-origin');
  assert.equal(opciones.signal, signal);
});
