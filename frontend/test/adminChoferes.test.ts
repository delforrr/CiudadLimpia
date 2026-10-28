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
})
