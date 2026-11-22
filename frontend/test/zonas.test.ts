import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { asignarZona, eliminarZona, guardarZona, zonasService, type CatalogoZonas } from '../src/services/zonasService.ts';
import { prepararTrayecto } from '../src/utils/trayectoEditor.ts';

const vacio: CatalogoZonas = { zonas: [], asignaciones: {} };
const storageOriginal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (storageOriginal) Object.defineProperty(globalThis, 'localStorage', storageOriginal);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('crea, consulta, edita y elimina una zona sin modificar el catálogo anterior', () => {
  const creado = guardarZona(vacio, { nombre: ' Centro ', descripcion: ' Zona céntrica ' });
  const zona = creado.zonas[0];
  assert.equal(zona.nombre, 'Centro');
  assert.equal(zona.descripcion, 'Zona céntrica');
  assert.ok(zona.id);
  const editado = guardarZona(creado, { nombre: 'Centro norte', descripcion: '' }, zona.id);
  assert.equal(editado.zonas[0].nombre, 'Centro norte');
  assert.equal(editado.zonas[0].id, zona.id);
  assert.deepEqual(eliminarZona(editado, zona.id), vacio);
  assert.deepEqual(vacio.zonas, []);
  assert.equal(creado.zonas[0].nombre, 'Centro');
});

test('rechaza nombres vacíos, duplicados y textos demasiado largos', () => {
  const catalogo = guardarZona(vacio, { nombre: 'Estación', descripcion: '' });
  for (const nombre of ['', '  ', ' estacion ', 'x'.repeat(101)]) {
    assert.throws(() => guardarZona(catalogo, { nombre, descripcion: '' }));
  }
  assert.throws(() => guardarZona(catalogo, { nombre: 'Sur', descripcion: 'x'.repeat(301) }));
  assert.throws(() => guardarZona(catalogo, { nombre: 'Sur', descripcion: '' }, 'no-existe'));
});

test('una zona agrupa varios trayectos y cada trayecto conserva una sola zona', () => {
  const catalogo = guardarZona(guardarZona(vacio, { nombre: 'Norte', descripcion: '' }), { nombre: 'Sur', descripcion: '' });
  const [norte, sur] = catalogo.zonas;
  const asignado = asignarZona(asignarZona(catalogo, 'ruta-1', norte.id), 'ruta-2', norte.id);
  assert.equal(Object.values(asignado.asignaciones).filter((id) => id === norte.id).length, 2);
  assert.throws(() => eliminarZona(asignado, norte.id), /Reasigná/);
  assert.throws(() => asignarZona(catalogo, 'ruta-1', 'no-existe'), /zona válida/);
  const reasignado = asignarZona(asignarZona(asignado, 'ruta-1', sur.id), 'ruta-2', sur.id);
  assert.equal(eliminarZona(reasignado, norte.id).zonas.length, 1);
  const renombrado = guardarZona(reasignado, { nombre: 'Sur nuevo', descripcion: '' }, sur.id);
  assert.equal(renombrado.asignaciones['ruta-1'], sur.id);
});

test('recupera zonas y asignaciones después de guardar en el navegador', () => {
  const datos = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => datos.get(key) ?? null,
    setItem: (key: string, value: string) => datos.set(key, value),
  } });
  assert.deepEqual(zonasService.cargar(), vacio);
  const creado = guardarZona(vacio, { nombre: 'Norte', descripcion: '' });
  const asignado = asignarZona(creado, 'ruta-1', creado.zonas[0].id);
  zonasService.guardar(asignado);
  assert.deepEqual(zonasService.cargar(), asignado);
  datos.set('ciudad-limpia:zonas', '{');
  assert.throws(() => zonasService.cargar());
});

test('la zona pertenece solo al frontend y no se envía al endpoint de trayectos', () => {
  const envio = prepararTrayecto({ nombre: 'Ruta 1', localidadId: 'localidad', zonaId: 'zona-local',
    puntos: [{ clave: '1', lat: -35.97, long: -62.73 }, { clave: '2', lat: -35.98, long: -62.74 }], lineaElegida: null });
  assert.equal('zonaId' in envio, false);
});
