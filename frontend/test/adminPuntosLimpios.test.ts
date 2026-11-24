import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ViteDevServer } from 'vite'
import { crearServidorPruebas } from './servidorPruebas.ts'
import { conLocalStorage, puntos, tipos } from './fixtures.ts'

let server: ViteDevServer
let AdminPuntosLimpios: ComponentType

before(async () => {
  server = await crearServidorPruebas(['react', 'react/jsx-runtime', 'react-router-dom'])
  ;({ AdminPuntosLimpios } = await server.ssrLoadModule(
    '/src/components/AdminPuntosLimpios.tsx',
  ))
})

after(async () => server?.close())

test('ignora el catálogo local y espera la respuesta del servidor', () => {
  conLocalStorage({
    'ciudad-limpia:tipos-puntos-limpios': tipos,
    'ciudad-limpia:puntos-limpios': puntos,
  }, () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(AdminPuntosLimpios)),
    )
    assert.match(html, /Puntos totales/)
    assert.match(html, /Cargando puntos limpios/)
    assert.doesNotMatch(html, /Supermercado Cooperativa Obrera|Plásticos|Botellero/)
  })
})
