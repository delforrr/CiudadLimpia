import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'
import { registerSchema } from '../src/schemas/registerSchema.ts'
import type { User } from '../src/services/authService.ts'

let server: ViteDevServer
let PerfilPage: ComponentType<{ initialRegister?: boolean }>
let AuthContext: typeof import('../src/context/auth-context.ts').AuthContext

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: ['react', 'react/jsx-runtime', 'react-router-dom', '@mui/material', '@mui/icons-material'] },
  })
  ;({ PerfilPage } = await server.ssrLoadModule('/src/pages/PerfilPage.tsx'))
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts'))
})
after(async () => server?.close())

function render(initialRegister = false, user: User | null = null) {
  const session = { user, checking: false, isAuthenticated: user !== null,
    loggingOut: false, logoutError: '', onAuthenticated: () => {}, logout: async () => {} }
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value: session },
    createElement(MemoryRouter, { initialEntries: [initialRegister ? '/registro' : '/perfil'] },
      createElement(PerfilPage, { initialRegister }))))
}

test('opens registration with all fields required by the current API', () => {
  const html = render(true)
  for (const label of ['Crear cuenta', 'Nombre', 'Apellido', 'Correo electrónico', 'Contraseña', 'Repetir contraseña']) {
    assert.ok(html.includes(label), label)
  }
  assert.match(html, /autoComplete="new-password"/)
  assert.doesNotMatch(html, /Recordarme|Ingresá tu nombre|Las contraseñas no coinciden|Mis domicilios|Dirección|Agregar domicilio/)
})

test('opens login separately without registration fields', () => {
  const html = render()
  assert.match(html, /Iniciar Sesión/)
  assert.match(html, /Recordarme/)
  assert.doesNotMatch(html, /Repetir contraseña|Mis domicilios|Etiqueta/)
})

test('displays saved address labels from the authenticated profile', () => {
  const user: User = { id: 'user-1', email: 'ana@example.com', role: 'USER',
    cliente: { id: 'cliente-1', name: 'Ana', lastName: 'Pérez',
      domicilios: [{ id: 'domicilio-1', direccion: 'San Martín 123', etiqueta: 'Casa' },
        { id: 'domicilio-2', direccion: 'Belgrano 456', etiqueta: null }] } }
  const html = render(false, user)
  for (const text of ['Mis domicilios', 'San Martín 123', 'Casa', 'Belgrano 456', 'Agregar domicilio']) {
    assert.ok(html.includes(text), text)
  }
  assert.doesNotMatch(html, /Sin domicilio registrado|No tenés domicilios registrados/)
})

test('validates registration fields together and normalizes the backend payload', () => {
  const form = { name: ' Ana ', lastName: ' Pérez ', email: ' ANA@example.com ',
    password: 'Clave!123', repeatedPassword: 'Clave!123', rememberMe: false }
  assert.deepEqual(registerSchema.parse(form), {
    name: 'Ana', lastName: 'Pérez', email: 'ana@example.com',
    password: 'Clave!123', repeatedPassword: 'Clave!123',
  })
  const invalid = registerSchema.safeParse({ ...form, name: ' ', lastName: ' ',
    email: 'inválido', repeatedPassword: 'otra' })
  assert.equal(invalid.success, false)
  if (!invalid.success) {
    assert.deepEqual(invalid.error.issues.map(({ path }) => path[0]).sort(),
      ['email', 'lastName', 'name', 'repeatedPassword'])
  }
})
