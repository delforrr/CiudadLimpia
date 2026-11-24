import assert from 'node:assert/strict';
import { test } from 'node:test';
import { domicilioUbicacionService, coordenadasDomicilioSchema } from '../src/services/domicilioUbicacionService.ts';

const posicion = { lat: -35.973, long: -62.734 };

test('busca el frente con la sesión y descarta pines fuera de Trenque Lauquen', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ sugerencias: [
    { ...posicion, calle: 'Roca', altura: 860 },
    { lat: 0, long: 0, calle: 'Fuera de la ciudad', altura: 860 },
  ] }));
  assert.deepEqual(await domicilioUbicacionService.buscar(' Roca ', ' 860 ', new AbortController().signal), [
    { ...posicion, nombre: 'Roca 860' },
  ]);
  const [url, opciones] = fetch.mock.calls[0].arguments;
  const consulta = new URL(String(url), 'http://localhost');
  assert.equal(consulta.pathname, '/api/geocodificacion/directa');
  assert.equal(consulta.searchParams.get('calle'), 'Roca');
  assert.equal(consulta.searchParams.get('altura'), '860');
  assert.equal(consulta.searchParams.get('desplazar'), 'true');
  assert.equal(opciones?.credentials, 'same-origin');
});

test('sin coincidencias devuelve una lista vacía para habilitar el mapa manual', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ sugerencias: [] }));
  assert.deepEqual(await domicilioUbicacionService.buscar('Prueba', '123', new AbortController().signal), []);
});

test('informa fallas de geocodificación', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(domicilioUbicacionService.buscar('Prueba', '123', new AbortController().signal));
});

test('admite coordenadas válidas dentro de la ciudad', () => {
  assert.equal(coordenadasDomicilioSchema.safeParse(posicion).success, true);
  assert.equal(coordenadasDomicilioSchema.safeParse({ lat: NaN, long: 0 }).success, false);
});
