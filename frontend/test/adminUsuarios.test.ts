import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'
import type { User } from '../src/services/authService.ts'

let server: ViteDevServer
let AdminUsuarios: ComponentType
let AuthContext: typeof import('../src/context/auth-context.ts').AuthContext

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ AdminUsuarios } = await server.ssrLoadModule(
    '/src/components/AdminUsuarios.tsx',
  ))
  ;({ AuthContext } = await server.ssrLoadModule(
    '/src/context/auth-context.ts',
  ))
})

after(async () => server?.close())

const admin: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'ADMIN',
  cliente: {
    id: 'cliente-1',
    name: 'Ana',
    lastName: 'Pérez',
    domicilios: [],
  },
}

function render() {
  const session = {
    user: admin,
    checking: false,
    isAuthenticated: true,
    loggingOut: false,
    logoutError: '',
    onAuthenticated: () => {},
    logout: async () => {},
  }
  return renderToStaticMarkup(
    createElement(
      AuthContext.Provider,
      { value: session },
      createElement(
        MemoryRouter,
        null,
        createElement(AdminUsuarios),
      ),
    ),
  )
}

test('renders the admin users module with its summary and search tools', () => {
  const html = render()
  assert.match(html, /Usuarios totales/)
  assert.match(html, /Padrón de usuarios/)
  assert.match(html, /Nombre, email o domicilio/)
  assert.match(html, /Todos los roles/)
  assert.match(html, /Cargando usuarios/)
})
