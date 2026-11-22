import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'
import { conLocalStorage } from './fixtures.ts'

let server: ViteDevServer
let AdminCamiones: ComponentType

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminCamiones } = await server.ssrLoadModule(
    '/src/components/AdminCamiones.tsx',
  ))
})

after(async () => server?.close())

test('carga los datos remotos e ignora los registros anteriores del navegador', () => {
  conLocalStorage({ 'ciudad-limpia:camiones': [{ code: 'Registro local', firstName: 'Registro local' }] }, () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminCamiones)))
    assert.match(html, /Flota de camiones/)
    assert.match(html, /Cargando camiones/)
    assert.match(html, /Agregar camión/)
    assert.doesNotMatch(html, /Registro local|En mantenimiento|Asignar trayectos/)
  })
})
