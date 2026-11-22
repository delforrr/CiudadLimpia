export const camiones = [
  {
    id: 't-001',
    code: 'Camión 01',
    plate: 'AE 123 CD',
    brand: 'Iveco',
    model: 'Tector 170E28',
    year: 2022,
    conductores: [{ nombre: 'Carlos González' }],
    status: 'OPERATIVO',
    trayectos: [],
  },
  {
    id: 't-002',
    code: 'Camión 02',
    plate: 'AF 456 TL',
    brand: 'Mercedes-Benz',
    model: 'Atego 1726',
    year: 2023,
    conductores: [{ nombre: 'Miguel Rodríguez' }],
    status: 'OPERATIVO',
    trayectos: [],
  },
  {
    id: 't-003',
    code: 'Camión 03',
    plate: 'AD 789 ZX',
    brand: 'Volkswagen',
    model: 'Constellation 17.280',
    year: 2021,
    conductores: [{ nombre: 'Roberto López' }],
    status: 'OPERATIVO',
    trayectos: [],
  },
  {
    id: 't-004',
    code: 'Camión 04',
    plate: 'AC 321 QR',
    brand: 'Ford',
    model: 'Cargo 1722',
    year: 2019,
    conductores: [],
    status: 'MANTENIMIENTO',
    trayectos: [],
  },
]

export const choferes = [
  {
    id: 'd-001',
    firstName: 'Carlos',
    lastName: 'González',
    dni: '28456789',
    phone: '02392-456789',
    status: 'ACTIVO',
    assignedTruck: 'Camión 01',
  },
  {
    id: 'd-002',
    firstName: 'Miguel',
    lastName: 'Rodríguez',
    dni: '30123456',
    phone: '02392-523456',
    status: 'ACTIVO',
    assignedTruck: 'Camión 02',
  },
  {
    id: 'd-003',
    firstName: 'Jorge',
    lastName: 'Fernández',
    dni: '27890432',
    phone: '02392-478902',
    status: 'INACTIVO',
    assignedTruck: null,
  },
  {
    id: 'd-004',
    firstName: 'Roberto',
    lastName: 'López',
    dni: '32567890',
    phone: '02392-567890',
    status: 'ACTIVO',
    assignedTruck: 'Camión 03',
  },
]

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
