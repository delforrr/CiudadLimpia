export type ContratoConductor = { inicio: string; fin?: string }
export type ErroresContrato = Partial<Record<'inicio' | 'fin', string>>
function fechaValida(fecha: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    && Number.isFinite(Date.parse(`${fecha}T00:00:00Z`))
    && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha
}

export function validarContrato(inicio: string, fin: string): ErroresContrato {
  const errores: ErroresContrato = {}
  if (!fechaValida(inicio)) errores.inicio = 'Ingresá una fecha de inicio válida'
  if (fin && !fechaValida(fin)) errores.fin = 'Ingresá una fecha de fin válida'
  else if (fin && !errores.inicio && fin <= inicio) errores.fin = 'La fecha de fin debe ser posterior a la de inicio'
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
