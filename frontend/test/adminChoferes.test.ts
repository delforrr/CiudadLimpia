import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ViteDevServer } from 'vite'
import { crearServidorPruebas } from './servidorPruebas.ts'
import { conLocalStorage } from './fixtures.ts'

let server: ViteDevServer
let AdminChoferes: ComponentType

before(async () => {
  server = await crearServidorPruebas(['react', 'react/jsx-runtime', 'react-router-dom'])
  ;({ AdminChoferes } = await server.ssrLoadModule(
    '/src/components/AdminChoferes.tsx',
  ))
})

after(async () => server?.close())

test('carga los datos remotos e ignora los registros anteriores del navegador', () => {
  conLocalStorage({ 'ciudad-limpia:choferes': [{ code: 'Registro local', firstName: 'Registro local' }] }, () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminChoferes)))
    assert.match(html, /Listado de choferes/)
    assert.match(html, /Cargando choferes/)
    assert.match(html, /Agregar chofer/)
    assert.doesNotMatch(html, /Registro local|DNI|Teléfono/)
  })
})
