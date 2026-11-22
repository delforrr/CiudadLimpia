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
}
export type PuntoLimpioApi = {
  id: string
  nombre: string
  tipoId: string
  direccionId: string
  lat: number
  long: number
}
export type DireccionApi = {
  id: string
  direccion: string
  calle: string
  altura: number
  lat: number
  long: number
}

const LOGO_POR_NOMBRE: Record<string, string> = {
  'Punto limpio': DEFAULT_TIPO_LOGOS.PUNTO_LIMPIO,
  Botellero: DEFAULT_TIPO_LOGOS.BOTELLERO,
  'Botellero y latero': DEFAULT_TIPO_LOGOS.LATERO,
}

export const puntosLimpiosService = {
  tipos: (signal?: AbortSignal) =>
    httpRequest<TipoPuntoLimpioApi[]>('/tipos-punto-limpio', { signal }),
  puntos: (signal?: AbortSignal) =>
    httpRequest<PuntoLimpioApi[]>('/puntos-limpios', { signal }),
  direcciones: (signal?: AbortSignal) =>
    httpRequest<DireccionApi[]>('/direcciones', { signal }),
}

export async function cargarCatalogoPuntosLimpios(signal?: AbortSignal) {
  const [tiposApi, puntosApi] = await Promise.all([
    puntosLimpiosService.tipos(signal),
    puntosLimpiosService.puntos(signal),
  ])

  // El listado de direcciones requiere rol ADMIN; en el mapa público se prescinde de él.
  const direccionesApi = await puntosLimpiosService.direcciones(signal).catch(() => [])
  const direcciones = new Map(direccionesApi.map((item) => [item.id, item.direccion]))

  const tipos: TipoPuntoLimpio[] = tiposApi.map((tipo) => {
    const materiales = tipo.residuos.map((residuo) => residuo.nombre)
    const logo = LOGO_POR_NOMBRE[tipo.nombre]
      ?? resolvePuntoLimpioLogo(undefined, tipo.id, tipo.nombre, materiales)
    return {
      id: tipo.id,
      nombre: tipo.nombre,
      materiales,
      logo,
      colorFondo: normalizeIconColor(undefined, puntoLimpioLogoColor(logo)),
    }
  })

  const puntos: PuntoLimpioAdmin[] = puntosApi.map((punto) => ({
    id: punto.id,
    nombre: punto.nombre,
    tipoId: punto.tipoId,
    direccion: direcciones.get(punto.direccionId)
      ?? (punto.lat !== undefined ? `${punto.lat}, ${punto.long}` : ''),
    estado: 'ACTIVO',
    lat: punto.lat,
    lng: punto.long,
  }))

  return { tipos, puntos }
}
