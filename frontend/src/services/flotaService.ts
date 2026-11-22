import { httpRequest } from './http.ts'
import type { ContratoConductor } from '../utils/contratoConductor.ts'

export type CamionDatos = {
  patente: string
  marca: string
  modelo: string
  anio: number
  estado: 'ACTIVO' | 'INACTIVO'
}

export type CamionApi = CamionDatos & { id: string }

export type ConductorDatos = {
  nombre: string
  apellido: string
  activo: boolean
}

export type ConductorApi = ConductorDatos & { id: string }

export type ContratoApi = {
  idCamion: string
  idConductor: string
  fechaInicio: string
  fechaFin: string | null
}

const camionesUrl = '/api/camiones'
const conductoresUrl = '/api/conductores'
const contratosUrl = '/api/contratos-conductor'

function guardar<T>(url: string, datos: object, id?: string) {
  return httpRequest<T>(id ? `${url}/${encodeURIComponent(id)}` : url, {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(datos),
  })
}

export const flotaService = {
  camiones: (signal?: AbortSignal) => httpRequest<CamionApi[]>(camionesUrl, { signal }),
  conductores: (signal?: AbortSignal) => httpRequest<ConductorApi[]>(conductoresUrl, { signal }),
  contratos: (signal?: AbortSignal) => httpRequest<ContratoApi[]>(contratosUrl, { signal }),
  guardarCamion: (datos: CamionDatos, id?: string) => guardar<CamionApi>(camionesUrl, datos, id),
  guardarConductor: (datos: ConductorDatos, id?: string) => guardar<ConductorApi>(conductoresUrl, datos, id),
  archivarCamion: (id: string) => guardar<CamionApi>(camionesUrl, { estado: 'INACTIVO' }, id),
  archivarConductor: (id: string) => guardar<ConductorApi>(conductoresUrl, { activo: false }, id),
  asignar: (idCamion: string, idConductor: string, { inicio, fin }: ContratoConductor) =>
    guardar<ContratoApi>(contratosUrl, {
      idCamion, idConductor,
      fechaInicio: `${inicio}T00:00:00-03:00`,
      fechaFin: fin ? `${fin}T00:00:00-03:00` : null,
    }),
  finalizar: ({ idCamion, idConductor, fechaInicio }: ContratoApi, fechaFin = new Date().toISOString()) =>
    httpRequest<ContratoApi>(
      `${contratosUrl}/${encodeURIComponent(idCamion)}/${encodeURIComponent(idConductor)}/${encodeURIComponent(fechaInicio)}`,
      { method: 'PATCH', body: JSON.stringify({ fechaFin }) },
    ),
}

export async function cargarFlota(signal?: AbortSignal) {
  const [camiones, conductores, contratos] = await Promise.all([
    flotaService.camiones(signal),
    flotaService.conductores(signal),
    flotaService.contratos(signal),
  ])
  return { camiones, conductores, contratos }
}

const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

export function fechasContrato(contrato?: ContratoApi): ContratoConductor | undefined {
  return contrato && {
    inicio: fechaLocal.format(new Date(contrato.fechaInicio)),
    fin: contrato.fechaFin ? fechaLocal.format(new Date(contrato.fechaFin)) : undefined,
  }
}

export function contratosPendientes(contratos: ContratoApi[], ahora = Date.now()) {
  return contratos
    .filter(({ fechaFin }) => fechaFin === null || Date.parse(fechaFin) > ahora)
    .sort((a, b) => Date.parse(a.fechaInicio) - Date.parse(b.fechaInicio))
}
