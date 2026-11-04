import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AdminPuntosLimpios: ComponentType

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminPuntosLimpios } = await server.ssrLoadModule(
    '/src/components/AdminPuntosLimpios.tsx',
  ))
})

after(async () => server?.close())

test('renders the clean points module with summary, toolbar and sample data', () => {
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(AdminPuntosLimpios)),
  )
  assert.match(html, /Puntos totales/)
  assert.match(html, /Punto Limpio/)
  assert.match(html, /Botellero/)
  assert.match(html, /Latero/)
  assert.match(html, /Puntos limpios registrados/)
  assert.match(html, /Agregar punto limpio/)
  assert.match(html, /Todos los tipos/)
  assert.match(html, /Materiales/)
  // Datos de muestra de los tres tipos
  assert.match(html, /Supermercado Cooperativa Obrera/)
  assert.match(html, /Escuela n\.º 8/)
  assert.match(html, /Parque Villegas/)
  assert.match(html, /Pasteur n\.º 1200/)
  // La latitud y longitud las administra el backend, no el panel
  assert.doesNotMatch(html, /Latitud/)
  assert.doesNotMatch(html, /Longitud/)
  // Los materiales se administran desde el apartado de tipos
  assert.doesNotMatch(html, /Materiales por tipo/)
  // Verifica que ya no muestra el esqueleto base
  assert.doesNotMatch(html, /Esqueleto base/)
})
