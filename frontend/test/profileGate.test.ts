import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'
import type { User } from '../src/services/authService.ts'

let server: ViteDevServer
let ProfileGate: ComponentType<{ children: ReactNode }>
let AuthContext: typeof import('../src/context/auth-context.ts').AuthContext

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom'] },
  })
  ;({ default: ProfileGate } = await server.ssrLoadModule('/src/components/ProfileGate.tsx'))
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts'))
})
after(async () => server?.close())

const user: User = {
  id: 'user-1', email: 'ana@example.com', role: 'USER',
  cliente: { id: 'cliente-1', name: 'Ana', lastName: 'Pérez', domicilios: [] },
}

function render(account: User | null, pathname = '/hoy', checking = false) {
  const session = { user: account, checking, isAuthenticated: account !== null,
    loggingOut: false, logoutError: '', onAuthenticated: () => {}, logout: async () => {} }
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value: session },
    createElement(MemoryRouter, { initialEntries: [pathname] },
      createElement(ProfileGate, { children: createElement('p', null, 'Contenido') }))))
}

test('blocks other pages for accounts without a cliente or addresses', () => {
  for (const account of [user, { ...user, cliente: null }]) {
    for (const pathname of ['/hoy', '/calendario', '/puntos-limpios']) {
      assert.equal(render(account, pathname), '')
    }
    assert.equal(render(account, '/perfil'), '<p>Contenido</p>')
  }
})

test('allows public visitors and accounts with an address', () => {
  assert.equal(render(null), '<p>Contenido</p>')
  assert.equal(render({ ...user, cliente: { ...user.cliente!, domicilios: [{ id: 'd1', direccion: 'San Martín 123' }] } }), '<p>Contenido</p>')
})

test('waits for session restoration before displaying a page', () => {
  assert.match(render(null, '/hoy', true), /role="status".*Comprobando sesión/)
  assert.doesNotMatch(render(null, '/hoy', true), /Contenido/)
})
