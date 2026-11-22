import type { PuntoLimpioAdmin, TipoPuntoLimpio } from './puntosLimpiosFormat'
import { normalizeIconColor, puntoLimpioLogoColor, puntoLimpioLogoId, resolvePuntoLimpioLogo } from './puntosLimpiosLogos'

const TIPOS_STORAGE_KEY = 'ciudad-limpia:tipos-puntos-limpios'
const PUNTOS_STORAGE_KEY = 'ciudad-limpia:puntos-limpios'

function readMateriales(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function loadTipos(): TipoPuntoLimpio[] {
  try {
    const raw = localStorage.getItem(TIPOS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item): TipoPuntoLimpio | null => {
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
        return {
          id: tipo.id,
          nombre: tipo.nombre.trim(),
          materiales,
          logo,
          colorFondo: normalizeIconColor(tipo.colorFondo, puntoLimpioLogoColor(logo)),
        }
      })
      .filter((tipo): tipo is TipoPuntoLimpio => tipo !== null)
  } catch {
    return []
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
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const ids = new Set(tipos.map((tipo) => tipo.id))
    const primerTipo = ids.values().next().value ?? ''

    return parsed
      .map((item) => {
        const punto = item as Record<string, unknown>
        const legacyTipo = typeof punto.tipo === 'string' ? punto.tipo : undefined
        const tipoId =
          typeof punto.tipoId === 'string' && ids.has(punto.tipoId)
            ? punto.tipoId
            : legacyTipo && ids.has(legacyTipo)
              ? legacyTipo
              : primerTipo

        return {
          id: typeof punto.id === 'string' ? punto.id : '',
          nombre: typeof punto.nombre === 'string' ? punto.nombre.trim() : '',
          tipoId,
          direccion: typeof punto.direccion === 'string' ? punto.direccion.trim() : '',
          estado: punto.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
          lat: typeof punto.lat === 'number' && Number.isFinite(punto.lat) ? punto.lat : undefined,
          lng: typeof punto.lng === 'number' && Number.isFinite(punto.lng) ? punto.lng : undefined,
        } as PuntoLimpioAdmin
      })
      .filter((punto) => punto.id && punto.nombre)
  } catch {
    return []
  }
}

export function savePuntos(puntos: PuntoLimpioAdmin[]) {
  try {
    localStorage.setItem(PUNTOS_STORAGE_KEY, JSON.stringify(puntos))
  } catch {
    // ignore storage errors
  }
}
