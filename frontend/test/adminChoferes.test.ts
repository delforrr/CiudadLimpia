import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AdminChoferes: ComponentType

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminChoferes } = await server.ssrLoadModule(
    '/src/components/AdminChoferes.tsx',
  ))
})

after(async () => server?.close())

test('renders the drivers module with summary and actions', () => {
  const html = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(AdminChoferes)),
  )
  assert.match(html, /Choferes totales/)
  assert.match(html, /Listado de choferes/)
  assert.match(html, /Agregar chofer/)
  assert.match(html, /Nombre, DNI, tel/)
  assert.match(html, /Camión 01/)
  assert.match(html, /Asignar/)
  assert.match(html, /admin-drivers-assign-btn/)
  // Verifica que en choferes sin camión se muestra el botón en lugar del texto "Sin asignar"
  assert.doesNotMatch(html, /Sin asignar/)
  // Verifica que no hay selector de estado en el formulario
  assert.doesNotMatch(html, /id="admin-drivers-form-status-select"/)
})
