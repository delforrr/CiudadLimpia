import { httpRequest } from './http.ts'

export type CamionApi = {
  id: string
  patente: string
  marca: string
  modelo: string
  anio: number
  estado: 'ACTIVO' | 'INACTIVO'
}

export type ConductorApi = {
  id: string
  nombre: string
  apellido: string
  activo: boolean
}

export type ContratoApi = {
  idCamion: string
  idConductor: string
  fechaInicio: string
  fechaFin: string | null
}

type ContratoUI = { inicio: string; fin?: string }
type AsignacionUI = { nombre: string; contrato?: ContratoUI }
type TrayectoUI = { id: string; name: string }

export type CamionUI = {
  id: string
  code: string
  plate: string
  brand: string
  model: string
  year: number
  status: 'OPERATIVO' | 'INACTIVO'
  conductores: AsignacionUI[]
  trayectos: TrayectoUI[]
}

export type ConductorUI = {
  id: string
  firstName: string
  lastName: string
  dni: string
  phone: string
  status: 'ACTIVO' | 'INACTIVO'
  assignedTruck: string | null
  contrato?: ContratoUI
}

const CAMIONES_KEY = 'ciudad-limpia:camiones'
const CONDUCTORES_KEY = 'ciudad-limpia:choferes'

function fecha(value: string) {
  return value.slice(0, 10)
}

function vigente(contrato: ContratoApi) {
  return !contrato.fechaFin || new Date(contrato.fechaFin) > new Date()
}

function contratoUI(contrato: ContratoApi): ContratoUI {
  return contrato.fechaFin
    ? { inicio: fecha(contrato.fechaInicio), fin: fecha(contrato.fechaFin) }
    : { inicio: fecha(contrato.fechaInicio) }
}

function guardar(clave: string, datos: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(datos))
  } catch {
    // La sincronización sigue disponible aunque el almacenamiento esté bloqueado.
  }
}

export const flotaService = {
  camiones: (signal?: AbortSignal) =>
    httpRequest<CamionApi[]>('/api/camiones', { signal }),
  conductores: (signal?: AbortSignal) =>
    httpRequest<ConductorApi[]>('/api/conductores', { signal }),
  contratos: (signal?: AbortSignal) =>
    httpRequest<ContratoApi[]>('/api/contratos-conductor', { signal }),
}

export async function cargarFlota(signal?: AbortSignal) {
  const [camiones, conductores, contratos] = await Promise.all([
    flotaService.camiones(signal),
    flotaService.conductores(signal),
    flotaService.contratos(signal),
  ])

  const camionesPorId = new Map(camiones.map((camion) => [camion.id, camion]))
  const contratosVigentes = contratos.filter(vigente)

  const trucks: CamionUI[] = camiones.map((camion) => ({
    id: camion.id,
    code: camion.patente,
    plate: camion.patente,
    brand: camion.marca,
    model: camion.modelo,
    year: camion.anio,
    status: camion.estado === 'ACTIVO' ? 'OPERATIVO' : 'INACTIVO',
    conductores: contratosVigentes
      .filter((contrato) => contrato.idCamion === camion.id)
      .flatMap((contrato): AsignacionUI[] => {
        const conductor = conductores.find((item) => item.id === contrato.idConductor)
        return conductor
          ? [{ nombre: `${conductor.nombre} ${conductor.apellido}`.trim(), contrato: contratoUI(contrato) }]
          : []
      }),
    trayectos: [],
  }))

  const drivers: ConductorUI[] = conductores.map((conductor) => {
    const contrato = contratosVigentes.find((item) => item.idConductor === conductor.id)
    const camion = contrato ? camionesPorId.get(contrato.idCamion) : undefined
    return {
      id: conductor.id,
      firstName: conductor.nombre,
      lastName: conductor.apellido,
      dni: '',
      phone: '',
      status: conductor.activo ? 'ACTIVO' : 'INACTIVO',
      assignedTruck: camion?.patente ?? null,
      contrato: contrato ? contratoUI(contrato) : undefined,
    }
  })

  return { trucks, drivers }
}

export async function sincronizarFlota(signal?: AbortSignal) {
  const flota = await cargarFlota(signal)
  guardar(CAMIONES_KEY, flota.trucks)
  guardar(CONDUCTORES_KEY, flota.drivers)
  return flota
}
