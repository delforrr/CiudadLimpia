import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { ViteDevServer } from 'vite'
import { crearServidorPruebas } from './servidorPruebas.ts'

let server: ViteDevServer
let catalogo: typeof import('../src/services/puntosLimpiosService.ts')
before(async () => {
  server = await crearServidorPruebas([])
  catalogo = await server.ssrLoadModule('/src/services/puntosLimpiosService.ts') as typeof catalogo
})
after(async () => server.close())

test('consulta los alias, conserva un catálogo vacío y usa la lista administrativa', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json([]))
  assert.deepEqual(await catalogo.cargarCatalogoPuntosLimpios(false), { tipos: [], puntos: [] })
  await catalogo.cargarCatalogoPuntosLimpios(true)
  assert.deepEqual(fetch.mock.calls.map(({ arguments: [url] }) => url), [
    '/api/tipos-punto-limpio', '/api/puntos-limpios',
    '/api/tipos-punto-limpio', '/api/puntos-limpios/administracion',
  ])
})

test('edita el tipo en la API y usa los materiales y el ícono devueltos', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({
    id: 'tipo', nombre: 'Envases', residuos: [{ id: 'r', nombre: 'Vidrio' }],
    logo: 'botellero', colorFondo: '#36cc00',
  }))
  const datos = { nombre: 'Envases', materiales: ['Vidrio'], logo: 'botellero', colorFondo: '#36cc00' }
  const guardado = await catalogo.puntosLimpiosService.guardarTipo(datos, 'tipo')
  assert.equal(guardado.colorFondo, '#36cc00')
  assert.deepEqual(guardado.materiales, ['Vidrio'])
  const [url, options] = fetch.mock.calls[0].arguments
  assert.equal(url, '/api/tipos-punto-limpio/tipo')
  assert.ok(options)
  assert.equal(options.method, 'PATCH')
  assert.deepEqual(JSON.parse(String(options.body)), datos)
})
