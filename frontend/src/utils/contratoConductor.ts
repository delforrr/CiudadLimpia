export type ContratoConductor = { inicio: string; fin?: string }
export type ErroresContrato = Partial<Record<'inicio' | 'fin', string>>
export type AsignacionConductor = { nombre: string; contrato?: ContratoConductor }

type CamionConConductores = {
  id: string
  conductores?: AsignacionConductor[]
  assignedDriver?: string
  contrato?: ContratoConductor
}

function fechaValida(fecha: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    && Number.isFinite(Date.parse(`${fecha}T00:00:00Z`))
    && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha
}

export function validarContrato(inicio: string, fin: string): ErroresContrato {
  const errores: ErroresContrato = {}
  if (!fechaValida(inicio)) errores.inicio = 'Ingresá una fecha de inicio válida'
  if (fin && !fechaValida(fin)) errores.fin = 'Ingresá una fecha de fin válida'
  else if (fin && !errores.inicio && fin < inicio) errores.fin = 'La fecha de fin no puede ser anterior al inicio'
  return errores
}

export function formatearFecha(fecha: string) {
  return fecha.split('-').reverse().join('/')
}

export function formatoContrato(contrato?: ContratoConductor) {
  if (!contrato?.inicio) return 'Sin fechas cargadas'
  return contrato.fin
    ? `${formatearFecha(contrato.inicio)} al ${formatearFecha(contrato.fin)}`
    : `Desde ${formatearFecha(contrato.inicio)} · Sin fecha de fin`
}

/** Adapta los camiones guardados con el formato anterior de un solo conductor. */
export function asignacionesCamion(camion: Pick<CamionConConductores, 'conductores' | 'assignedDriver' | 'contrato'>): AsignacionConductor[] {
  if (Array.isArray(camion.conductores)) return camion.conductores
  if (camion.assignedDriver && camion.assignedDriver !== 'Sin asignar') {
    return [{ nombre: camion.assignedDriver, contrato: camion.contrato }]
  }
  return []
}

/** Asigna un conductor a una unidad y lo desvincula de cualquier otra. */
export function asignarConductor<T extends CamionConConductores>(
  flota: T[], unidad: T, nombre: string, contrato: ContratoConductor,
): T[] {
  return flota.map((camion) => {
    const asignaciones = asignacionesCamion(camion)
    const conductores = asignaciones.filter((asignacion) => asignacion.nombre !== nombre)
    if (camion.id !== unidad.id) {
      return conductores.length === asignaciones.length ? camion : { ...camion, conductores }
    }
    const nueva = { nombre, contrato }
    if (asignaciones.some((asignacion) => asignacion.nombre === nombre)) {
      return {
        ...camion,
        conductores: asignaciones.map((asignacion) => asignacion.nombre === nombre ? nueva : asignacion),
      }
    }
    return { ...camion, conductores: [...conductores, nueva] }
  })
}

export function quitarConductor<T extends CamionConConductores>(flota: T[], idUnidad: string, nombre: string): T[] {
  return flota.map((camion) => {
    if (camion.id !== idUnidad) return camion
    const conductores = asignacionesCamion(camion).filter((asignacion) => asignacion.nombre !== nombre)
    return conductores.length === asignacionesCamion(camion).length ? camion : { ...camion, conductores }
  })
}

export function actualizarAsignacion<T extends { id: string; assignedDriver: string; contrato?: ContratoConductor }>(flota: T[], unidad: T): T[] {
  return flota.map((camion) => {
    if (camion.id === unidad.id) return unidad
    if (unidad.assignedDriver !== 'Sin asignar' && camion.assignedDriver === unidad.assignedDriver) {
      return { ...camion, assignedDriver: 'Sin asignar', contrato: undefined }
    }
    return camion
  })
}
