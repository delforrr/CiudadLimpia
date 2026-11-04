import type { PuntoLimpioAdmin, TipoPuntoLimpio } from './puntosLimpiosFormat'
import { DEFAULT_TIPO_LOGOS, normalizeIconColor, puntoLimpioLogoColor, puntoLimpioLogoId, resolvePuntoLimpioLogo } from './puntosLimpiosLogos'

const TIPOS_STORAGE_KEY = 'ciudad-limpia:tipos-puntos-limpios'
const PUNTOS_STORAGE_KEY = 'ciudad-limpia:puntos-limpios'
const LEGACY_MATERIALES_STORAGE_KEY = 'ciudad-limpia:materiales-puntos-limpios'

export const DEFAULT_TIPOS: TipoPuntoLimpio[] = [
  {
    id: 'PUNTO_LIMPIO',
    nombre: 'Punto Limpio',
    materiales: ['Plásticos', 'Cartón', 'Papel', 'Vidrio', 'Metales'],
    logo: DEFAULT_TIPO_LOGOS.PUNTO_LIMPIO,
  },
  {
    id: 'BOTELLERO',
    nombre: 'Botellero',
    materiales: ['Botellas de Plástico', 'Botellas de Vidrio'],
    logo: DEFAULT_TIPO_LOGOS.BOTELLERO,
  },
  {
    id: 'LATERO',
    nombre: 'Latero',
    materiales: ['Latas de aluminio', 'Botellas plásticas', 'Vidrio'],
    logo: DEFAULT_TIPO_LOGOS.LATERO,
  },
]

export const SEED_PUNTOS: PuntoLimpioAdmin[] = [
  {
    id: 'pl-001',
    nombre: 'Supermercado Cooperativa Obrera',
    tipoId: 'PUNTO_LIMPIO',
    direccion: 'Pasteur n.º 1200',
    estado: 'ACTIVO',
  },
  {
    id: 'pl-002',
    nombre: 'Barrio Esperanza',
    tipoId: 'PUNTO_LIMPIO',
    direccion: 'Freyre (entre Carmen Granada y Estrada Este)',
    estado: 'ACTIVO',
  },
  {
    id: 'pl-003',
    nombre: 'Polo Científico Tecnológico',
    tipoId: 'PUNTO_LIMPIO',
    direccion: 'Hernández n.º 816',
    estado: 'ACTIVO',
  },
  {
    id: 'pl-004',
    nombre: 'Polo Ambiental · Estación de Transferencia',
    tipoId: 'PUNTO_LIMPIO',
    direccion: 'Calle Scalese n.º 1500',
    estado: 'ACTIVO',
  },
  {
    id: 'pl-005',
    nombre: 'Escuela n.º 8',
    tipoId: 'BOTELLERO',
    direccion: 'Orellana n.º 1100',
    estado: 'ACTIVO',
  },
  {
    id: 'pl-006',
    nombre: 'Supermercado Carnes del Colegio',
    tipoId: 'BOTELLERO',
    direccion: 'Roca n.º 257',
    estado: 'INACTIVO',
  },
  {
    id: 'pl-007',
    nombre: 'Predio de la Estación del Ferrocarril',
    tipoId: 'LATERO',
    direccion: 'Wilde y Villegas',
    estado: 'ACTIVO',
  },
  {
    id: 'pl-008',
    nombre: 'Parque Villegas',
    tipoId: 'LATERO',
    direccion: 'Presidente Uriburu n.º 1050 (sector parrillas)',
    estado: 'ACTIVO',
  },
]

function readMateriales(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function loadLegacyMateriales(): Record<string, string[]> | null {
  try {
    const raw = localStorage.getItem(LEGACY_MATERIALES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const result: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const materiales = readMateriales(value)
      if (materiales.length > 0) result[key] = materiales
    }
    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}

export function loadTipos(): TipoPuntoLimpio[] {
  try {
    const raw = localStorage.getItem(TIPOS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        const tipos = parsed
          .map((item) => {
            const tipo = item as Partial<TipoPuntoLimpio>
            if (typeof tipo.id !== 'string' || typeof tipo.nombre !== 'string') {
              return null
            }
            const materiales = readMateriales(tipo.materiales)
            if (!tipo.nombre.trim() || materiales.length === 0) return null
            const logo = resolvePuntoLimpioLogo(
              typeof tipo.logo === 'string' ? tipo.logo : undefined,
              tipo.id,
              tipo.nombre,
              materiales,
            )
            const itemResult: TipoPuntoLimpio = {
              id: tipo.id,
              nombre: tipo.nombre.trim(),
              materiales,
              logo,
              colorFondo: normalizeIconColor(tipo.colorFondo, puntoLimpioLogoColor(logo)),
            }
            return itemResult
          })
          .filter((tipo): tipo is TipoPuntoLimpio => tipo !== null)
        if (tipos.length > 0) return tipos
      }
    }

    const legacy = loadLegacyMateriales()
    if (!legacy) return DEFAULT_TIPOS
    return DEFAULT_TIPOS.map((tipo) => ({
      ...tipo,
      materiales: legacy[tipo.id]?.length ? legacy[tipo.id] : tipo.materiales,
    }))
  } catch {
    return DEFAULT_TIPOS
  }
}

export function saveTipos(tipos: TipoPuntoLimpio[]) {
  try {
    localStorage.setItem(TIPOS_STORAGE_KEY, JSON.stringify(tipos.map((tipo) => ({
      ...tipo,
      logo: puntoLimpioLogoId(tipo.logo),
    }))))
  } catch {
    // ignore storage errors
  }
}

export function loadPuntos(tipos: TipoPuntoLimpio[]): PuntoLimpioAdmin[] {
  try {
    const raw = localStorage.getItem(PUNTOS_STORAGE_KEY)
    if (!raw) return SEED_PUNTOS
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_PUNTOS

    const ids = new Set(tipos.map((tipo) => tipo.id))
    const fallbackId = tipos[0]?.id ?? 'PUNTO_LIMPIO'

    return parsed
      .map((item) => {
        const punto = item as Record<string, unknown>
        const legacyTipo =
          typeof punto.tipo === 'string' ? punto.tipo : undefined
        const tipoId =
          typeof punto.tipoId === 'string' && ids.has(punto.tipoId)
            ? punto.tipoId
            : legacyTipo && ids.has(legacyTipo)
              ? legacyTipo
              : fallbackId

        return {
          id: typeof punto.id === 'string' ? punto.id : '',
          nombre:
            typeof punto.nombre === 'string' ? punto.nombre.trim() : '',
          tipoId,
          direccion:
            typeof punto.direccion === 'string'
              ? punto.direccion.trim()
              : '',
          estado: punto.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
        } as PuntoLimpioAdmin
      })
      .filter((punto) => punto.id && punto.nombre)
  } catch {
    return SEED_PUNTOS
  }
}

export function savePuntos(puntos: PuntoLimpioAdmin[]) {
  try {
    localStorage.setItem(PUNTOS_STORAGE_KEY, JSON.stringify(puntos))
  } catch {
    // ignore storage errors
  }
}
