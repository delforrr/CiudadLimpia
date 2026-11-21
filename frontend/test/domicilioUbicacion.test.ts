import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { domicilioUbicacionService, coordenadasDomicilioSchema } from '../src/services/domicilioUbicacionService.ts';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  mock.restoreAll();
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
const posicion = { lat: -35.973, long: -62.734 };

test('busca calle y altura limitadas a Trenque Lauquen, sin enviar credenciales', async () => {
  mock.method(globalThis, 'fetch', async (url: string, opciones: RequestInit) => {
    const consulta = new URL(url);
    assert.equal(consulta.searchParams.get('direccion'), 'Roca 860');
    assert.equal(consulta.searchParams.get('localidad_censal'), '06826050');
    assert.equal(opciones.credentials, 'omit');
    return Response.json({ direcciones: [
      { localidad_censal: { id: '06826050' }, ubicacion: { lat: posicion.lat, lon: posicion.long }, nomenclatura: 'Roca 860' },
      { localidad_censal: { id: 'otra-ciudad' }, ubicacion: { lat: posicion.lat, lon: posicion.long } },
      { localidad_censal: { id: '06826050' }, ubicacion: { lat: null, lon: null } },
      { localidad_censal: { id: '06826050' }, ubicacion: { lat: 0, lon: 0 } },
    ] });
  });
  assert.deepEqual(await domicilioUbicacionService.buscar(' Roca ', ' 860 ', new AbortController().signal), [
    { ...posicion, nombre: 'Roca 860' },
  ]);
});

test('sin coincidencias devuelve una lista vacía para habilitar la elección manual', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ direcciones: [] }));
  assert.deepEqual(await domicilioUbicacionService.buscar('Prueba', '123', new AbortController().signal), []);
});

test('informa fallas de geocodificación y descarta respuestas inválidas', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(domicilioUbicacionService.buscar('Prueba', '123', new AbortController().signal));
  fetch.mock.mockImplementation(async () => Response.json({}));
  await assert.rejects(domicilioUbicacionService.buscar('Prueba', '123', new AbortController().signal));
});

test('guarda la ubicación confirmada por usuario y dirección sin depender de los IDs regenerados', () => {
  const datos = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => datos.get(key) ?? null, setItem: (key: string, valor: string) => datos.set(key, valor),
  } });
  domicilioUbicacionService.guardar('vecino-1', ' Roca  860 ', posicion);
  assert.deepEqual(domicilioUbicacionService.leer('vecino-1', 'roca 860'), posicion);
  assert.equal(domicilioUbicacionService.leer('vecino-2', 'Roca 860'), undefined);
  assert.equal(domicilioUbicacionService.leer('vecino-1', 'Roca 123'), undefined);
});

test('admite coordenadas válidas dentro de la ciudad', () => {
  assert.equal(coordenadasDomicilioSchema.safeParse(posicion).success, true);
  assert.equal(coordenadasDomicilioSchema.safeParse({ lat: NaN, long: 0 }).success, false);
});
