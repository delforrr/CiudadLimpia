import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { trayectosLocalesService } from '../src/services/trayectosLocalesService.ts';

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

test('conserva la eliminación al recargar y quita solo las asignaciones del trayecto', () => {
  const datos = storage({
    'ciudad-limpia:zonas': JSON.stringify({ zonas: [{ id: 'norte' }], asignaciones: { 'ruta-1': 'norte', 'ruta-2': 'norte' } }),
    'ciudad-limpia:camiones': JSON.stringify([{ id: 'camion-1', conductores: ['Ana'], trayectos: [{ id: 'ruta-1' }, { id: 'ruta-2' }] }]),
  });
  assert.deepEqual(trayectosLocalesService.eliminados(), []);
  trayectosLocalesService.eliminar('ruta-1');
  assert.deepEqual(trayectosLocalesService.eliminados(), ['ruta-1']);
  assert.deepEqual(JSON.parse(datos.get('ciudad-limpia:zonas')!).asignaciones, { 'ruta-2': 'norte' });
  const camion = JSON.parse(datos.get('ciudad-limpia:camiones')!)[0];
  assert.deepEqual(camion.trayectos, [{ id: 'ruta-2' }]);
  assert.deepEqual(camion.conductores, ['Ana']);
  trayectosLocalesService.eliminar('ruta-1');
  assert.deepEqual(trayectosLocalesService.eliminados(), ['ruta-1']);
});

test('si falla la persistencia restaura las asignaciones y no marca el trayecto como eliminado', () => {
  const valores = { 'ciudad-limpia:zonas': JSON.stringify({ zonas: [], asignaciones: { 'ruta-1': 'norte' } }) };
  const datos = storage(valores, 'ciudad-limpia:zonas');
  assert.throws(() => trayectosLocalesService.eliminar('ruta-1'));
  assert.deepEqual(trayectosLocalesService.eliminados(), []);
  assert.equal(datos.get('ciudad-limpia:zonas'), valores['ciudad-limpia:zonas']);
});
