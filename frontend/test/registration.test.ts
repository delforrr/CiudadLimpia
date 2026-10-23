import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'
import { registerSchema } from '../src/schemas/registerSchema.ts'

let server: ViteDevServer
let PerfilPage: ComponentType<{ initialRegister?: boolean }>
let AuthContext: typeof import('../src/context/auth-context.ts').AuthContext

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom', '@mui/material'] },
  })
  ;({ PerfilPage } = await server.ssrLoadModule('/src/pages/PerfilPage.tsx'))
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts'))
})
after(async () => server?.close())

function render(initialRegister = false) {
  const session = { user: null, checking: false, isAuthenticated: false,
    loggingOut: false, logoutError: '', onAuthenticated: () => {}, logout: async () => {} }
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value: session },
    createElement(MemoryRouter, { initialEntries: [initialRegister ? '/registro' : '/perfil'] },
      createElement(PerfilPage, { initialRegister }))))
}

test('opens registration with all fields required by the current API', () => {
  const html = render(true)
  for (const label of ['Crear cuenta', 'Nombre', 'Apellido', 'Domicilios', 'Correo electrónico', 'Contraseña', 'Repetir contraseña']) {
    assert.ok(html.includes(label), label)
  }
  assert.match(html, /autoComplete="new-password"/)
  assert.doesNotMatch(html, /Recordarme|Ingresá tu nombre|Las contraseñas no coinciden/)
})

test('opens login separately without registration fields', () => {
  const html = render()
  assert.match(html, /Iniciar Sesión/)
  assert.match(html, /Recordarme/)
  assert.doesNotMatch(html, /Repetir contraseña|Una dirección por línea/)
})

test('validates registration fields together and normalizes the backend payload', () => {
  const form = { name: ' Ana ', lastName: ' Pérez ', email: ' ANA@example.com ',
    direccion: ' San Martín 123 \n Belgrano 456 ', password: 'Clave!123',
    repeatedPassword: 'Clave!123', rememberMe: false }
  assert.deepEqual(registerSchema.parse(form), {
    name: 'Ana', lastName: 'Pérez', email: 'ana@example.com',
    direccion: [{ direccion: 'San Martín 123' }, { direccion: 'Belgrano 456' }],
    password: 'Clave!123', repeatedPassword: 'Clave!123', rememberMe: false,
  })
  const invalid = registerSchema.safeParse({ ...form, name: ' ', lastName: ' ',
    direccion: '', email: 'inválido', repeatedPassword: 'otra' })
  assert.equal(invalid.success, false)
  if (!invalid.success) {
    assert.deepEqual(invalid.error.issues.map(({ path }) => path[0]).sort(),
      ['direccion', 'email', 'lastName', 'name', 'repeatedPassword'])
  }
})
