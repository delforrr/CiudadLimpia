import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { direccionesService } from '../src/services/direccionesService.ts';

afterEach(() => mock.restoreAll());

test('consulta el pin compartido y permite corregir solo las coordenadas', async () => {
  const ubicacion = { lat: -35.972, long: -62.741 };
  const guardada = { ...ubicacion, id: 'd1', calle: 'Monferrand', altura: 150, direccion: 'Monferrand 150' };
  const signal = new AbortController().signal;
  const fetch = mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/direcciones/d1');
    assert.equal(options.credentials, 'same-origin');
    if (options.method === 'PATCH') assert.deepEqual(JSON.parse(String(options.body)), ubicacion);
    else assert.equal(options.signal, signal);
    return Response.json(guardada);
  });
  assert.deepEqual(await direccionesService.consultar('d1', signal), guardada);
  assert.deepEqual(await direccionesService.corregirUbicacion('d1', ubicacion), guardada);
  assert.equal(fetch.mock.callCount(), 2);
});
