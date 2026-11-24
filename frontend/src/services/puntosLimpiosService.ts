import { httpRequest } from './http.ts'
import type {
  PuntoLimpioAdmin,
  TipoPuntoLimpio,
} from '../utils/puntosLimpiosFormat.ts'
import {
  DEFAULT_TIPO_LOGOS,
  normalizeIconColor,
  puntoLimpioLogoColor,
  resolvePuntoLimpioLogo,
} from '../utils/puntosLimpiosLogos.ts'

export type ResiduoApi = { id: string; nombre: string }
export type TipoPuntoLimpioApi = {
  id: string
  nombre: string
  residuos: ResiduoApi[]
  logo?: string | null
  colorFondo?: string | null
}
export type PuntoLimpioApi = {
  id: string
  nombre: string
  tipoId: string
  direccionId: string
  direccion: string
  estado: PuntoLimpioAdmin['estado']
  lat: number
  long: number
}
const LOGO_POR_NOMBRE: Record<string, string> = {
  'Punto limpio': DEFAULT_TIPO_LOGOS.PUNTO_LIMPIO,
  Botellero: DEFAULT_TIPO_LOGOS.BOTELLERO,
  'Botellero y latero': DEFAULT_TIPO_LOGOS.LATERO,
}

const urlTipos = '/api/tipos-punto-limpio'
const urlPuntos = '/api/puntos-limpios'

export type PuntoLimpioEscritura = Pick<PuntoLimpioApi, 'nombre' | 'tipoId' | 'estado'> &
  Partial<{ direccion: { calle: string; altura: number }; lat: number; long: number }>

function adaptarTipo(tipo: TipoPuntoLimpioApi): TipoPuntoLimpio {
  const materiales = tipo.residuos.map((residuo) => residuo.nombre)
  const logo = resolvePuntoLimpioLogo(tipo.logo ?? LOGO_POR_NOMBRE[tipo.nombre], tipo.id, tipo.nombre, materiales)
  return {
    id: tipo.id, nombre: tipo.nombre, materiales, logo,
    colorFondo: normalizeIconColor(tipo.colorFondo, puntoLimpioLogoColor(logo)),
  }
}

function adaptarPunto({ id, nombre, tipoId, direccion, estado, lat, long }: PuntoLimpioApi): PuntoLimpioAdmin {
  return { id, nombre, tipoId, direccion, estado, lat, lng: long }
}

export const puntosLimpiosService = {
  async guardarPunto(datos: PuntoLimpioEscritura, id?: string) {
    const punto = await httpRequest<PuntoLimpioApi>(id ? urlPuntos + '/' + id : urlPuntos, {
      method: id ? 'PATCH' : 'POST', body: JSON.stringify(datos),
    })
    return adaptarPunto(punto)
  },
  async guardarTipo(datos: Omit<TipoPuntoLimpio, 'id'>, id?: string) {
    const tipo = await httpRequest<TipoPuntoLimpioApi>(id ? urlTipos + '/' + id : urlTipos, {
      method: id ? 'PATCH' : 'POST', body: JSON.stringify(datos),
    })
    return adaptarTipo(tipo)
  },
  eliminarPunto: (id: string) => httpRequest<void>(urlPuntos + '/' + id, { method: 'DELETE' }),
  eliminarTipo: (id: string) => httpRequest<void>(urlTipos + '/' + id, { method: 'DELETE' }),
}

export async function cargarCatalogoPuntosLimpios(administracion: boolean, signal?: AbortSignal) {
  const [tipos, puntos] = await Promise.all([
    httpRequest<TipoPuntoLimpioApi[]>(urlTipos, { signal }),
    httpRequest<PuntoLimpioApi[]>(administracion ? urlPuntos + '/administracion' : urlPuntos, { signal }),
  ])
  return { tipos: tipos.map(adaptarTipo), puntos: puntos.map(adaptarPunto) }
}
