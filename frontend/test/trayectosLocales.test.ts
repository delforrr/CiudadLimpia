import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { trayectosLocalesService } from '../src/services/trayectosLocalesService.ts';
import { trayectosService } from '../src/services/trayectosService.ts';

test('elimina por API y el siguiente listado refleja la baja', async (t) => {
  const id = 'd6b3ff34-15fc-4a47-b299-8d16a321218d';
  let registros = [{ id }];
  t.mock.method(globalThis, 'fetch', async (url: string, opciones: RequestInit) => {
    if (url === '/api/trayectos') return Response.json(registros);
    assert.equal(url, `/api/trayectos/${id}`);
    assert.equal(opciones.method, 'DELETE');
    assert.equal(opciones.credentials, 'same-origin');
    assert.equal(new Headers(opciones.headers).get('Content-Type'), 'application/json');
    registros = [];
    return new Response(null, { status: 204 });
  });

  assert.deepEqual(await trayectosService.listar(), [{ id }]);
  await trayectosService.eliminar(id);
  assert.deepEqual(await trayectosService.listar(), []);
});

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
function storage(valores: Record<string, string> = {}, fallarEn?: string) {
  const datos = new Map(Object.entries(valores));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => datos.get(key) ?? null,
    setItem: (key: string, valor: string) => {
      if (fallarEn === key) { fallarEn = undefined; throw new Error('Almacenamiento bloqueado'); }
      datos.set(key, valor);
    },
    removeItem: (key: string) => datos.delete(key),
  } });
  return datos;
}

test('quita solo la asignación de zona sin tocar los camiones anteriores', () => {
  const datos = storage({
    'ciudad-limpia:zonas': JSON.stringify({ zonas: [{ id: 'norte' }], asignaciones: { 'ruta-1': 'norte', 'ruta-2': 'norte' } }),
    'ciudad-limpia:camiones': JSON.stringify([{ id: 'camion-1', conductores: ['Ana'], trayectos: [{ id: 'ruta-1' }, { id: 'ruta-2' }] }]),
  });
  trayectosLocalesService.quitarAsignaciones('ruta-1');
  assert.equal(datos.has('ciudad-limpia:trayectos-eliminados'), false);
  assert.deepEqual(JSON.parse(datos.get('ciudad-limpia:zonas')!).asignaciones, { 'ruta-2': 'norte' });
  const camion = JSON.parse(datos.get('ciudad-limpia:camiones')!)[0];
  assert.deepEqual(camion.trayectos, [{ id: 'ruta-1' }, { id: 'ruta-2' }]);
  assert.deepEqual(camion.conductores, ['Ana']);
});

test('si falla la persistencia conserva las asignaciones de zona', () => {
  const valores = {
    'ciudad-limpia:zonas': JSON.stringify({ zonas: [], asignaciones: { 'ruta-1': 'norte' } }),
    'ciudad-limpia:camiones': JSON.stringify([{ id: 'camion-1', trayectos: [{ id: 'ruta-1' }] }]),
  };
  const datos = storage(valores, 'ciudad-limpia:zonas');
  assert.throws(() => trayectosLocalesService.quitarAsignaciones('ruta-1'));
  assert.deepEqual(Object.fromEntries(datos), valores);
});
