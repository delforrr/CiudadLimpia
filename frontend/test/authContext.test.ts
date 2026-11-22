import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'

let server: ViteDevServer
let AuthProvider: ComponentType<{ children?: ReactNode }>
let AuthContext: typeof import('../src/context/auth-context.ts').AuthContext
let useAuthContext: typeof import('../src/hooks/useAuthContext.ts').useAuthContext

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime'] },
  })
  ;({ AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.tsx'))
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts'))
  ;({ useAuthContext } = await server.ssrLoadModule('/src/hooks/useAuthContext.ts'))
})

after(async () => server?.close())

test('requires the shared authentication provider', () => {
  function Consumer() {
    useAuthContext()
    return null
  }
  assert.throws(() => renderToStaticMarkup(createElement(Consumer)), /AuthProvider/)
})

test('starts checking the server session without trusting sessionStorage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() { throw new Error('Session storage must not be read') },
  })
  try {
    function Consumer() {
      const auth = useAuthContext()
      assert.equal(auth.user, null)
      assert.equal(auth.isAuthenticated, false)
      assert.equal(auth.checking, true)
      return createElement('p', null, 'Comprobando sesión')
    }
    assert.equal(
      renderToStaticMarkup(createElement(AuthProvider, null, createElement(Consumer))),
      '<p>Comprobando sesión</p>',
    )
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original)
    else Reflect.deleteProperty(globalThis, 'sessionStorage')
  }
})

test('all consumers receive the same user and session actions', () => {
  const session = {
    user: { id: '1', email: 'ana@example.com', role: 'USER' as const, cliente: { id: 'c1', name: 'Ana', lastName: 'Pérez', domicilios: [] } },
    isAuthenticated: true,
    checking: false,
    loggingOut: false,
    logoutError: '',
    onAuthenticated: () => {},
    logout: async () => {},
  }
  let consumers = 0
  function Consumer() {
    assert.equal(useAuthContext(), session)
    consumers++
    return null
  }
  renderToStaticMarkup(createElement(AuthContext.Provider, { value: session },
    createElement(Consumer), createElement(Consumer)))
  assert.equal(consumers, 2)
})
