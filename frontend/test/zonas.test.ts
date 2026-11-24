import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zonasService } from '../src/services/zonasService.ts';
import { prepararTrayecto } from '../src/utils/trayectoEditor.ts';

test('persiste y consulta zonas en la API', async (t) => {
  const zona = { id: 'zona-1', nombre: 'Zona Norte', descripcion: '', localidadId: '06826050' };
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(zona));
  const { id, ...datos } = zona;
  assert.deepEqual(await zonasService.crear(datos), zona);
  await zonasService.editar(id, datos);
  assert.equal(fetch.mock.calls[0].arguments[0], '/api/zonas');
  assert.equal(fetch.mock.calls[0].arguments[1]?.method, 'POST');
  assert.equal(fetch.mock.calls[1].arguments[0], '/api/zonas/zona-1');
  assert.equal(fetch.mock.calls[1].arguments[1]?.method, 'PATCH');
});

test('el envío del trayecto exige zona y la guarda junto con la geometría', () => {
  const borrador = { nombre: 'Trayecto', localidadId: '06826050', puntos: [], lineaElegida: null };
  assert.throws(() => prepararTrayecto(borrador), /Elegí una zona/);
  assert.equal(prepararTrayecto({ ...borrador, zonaId: 'zona-1' }).zonaId, 'zona-1');
});
