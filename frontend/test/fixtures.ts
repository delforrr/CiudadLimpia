export const tipos = [
  {
    id: 'PUNTO_LIMPIO',
    nombre: 'Punto Limpio',
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
  },
  { id: 'BOTELLERO', nombre: 'Botellero', materiales: ['Botellas de Plástico', 'Botellas de Vidrio'] },
  {
    id: 'LATERO',
    nombre: 'Latero',
    materiales: ['Latas de aluminio', 'Botellas plásticas', 'Vidrio'],
  },
]

export const puntos = [
  {
    id: 'punto-1',
    nombre: 'Supermercado Cooperativa Obrera',
    tipoId: 'PUNTO_LIMPIO',
    direccion: 'Pasteur n.º 1200',
    estado: 'ACTIVO',
  },
  { id: 'punto-2', nombre: 'Escuela n.º 8', tipoId: 'BOTELLERO', direccion: 'Orellana n.º 1100', estado: 'ACTIVO' },
  { id: 'punto-3', nombre: 'Parque Villegas', tipoId: 'LATERO', direccion: 'Presidente Uriburu n.º 1050', estado: 'ACTIVO' },
]

export function conLocalStorage(datos: Record<string, unknown>, accion: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const valores = { ...datos }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (clave: string) => clave in valores ? JSON.stringify(valores[clave]) : null,
      setItem: (clave: string, valor: string) => { valores[clave] = JSON.parse(valor) },
      removeItem: (clave: string) => { delete valores[clave] },
      clear: () => { for (const clave of Object.keys(valores)) delete valores[clave] },
    },
  })
  try {
    accion()
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}
