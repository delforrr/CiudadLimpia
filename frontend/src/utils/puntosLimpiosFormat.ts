export type EstadoPuntoLimpio = 'ACTIVO' | 'INACTIVO'

export interface TipoPuntoLimpio {
  id: string
  nombre: string
  materiales: string[]
  logo?: string
  colorFondo?: string
}

export interface PuntoLimpioAdmin {
  id: string
  nombre: string
  tipoId: string
  direccion: string
  estado: EstadoPuntoLimpio
}

export const ESTADO_PUNTO_LIMPIO_LABELS: Record<EstadoPuntoLimpio, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
}

export function estadoPuntoLabel(estado: EstadoPuntoLimpio) {
  return ESTADO_PUNTO_LIMPIO_LABELS[estado]
}

export function estadoPuntoChipClass(estado: EstadoPuntoLimpio) {
  return estado === 'ACTIVO' ? 'is-active' : 'is-inactive'
}

export function tipoToneClass(index: number) {
  const safeIndex = ((index % 6) + 6) % 6
  return `is-tone-${safeIndex}`
}

export function findTipoPunto(
  tipos: TipoPuntoLimpio[],
  tipoId: string,
) {
  return tipos.find((tipo) => tipo.id === tipoId)
}

export function tipoPuntoNombre(tipos: TipoPuntoLimpio[], tipoId: string) {
  return findTipoPunto(tipos, tipoId)?.nombre ?? 'Sin tipo'
}

export function tipoPuntoMateriales(
  tipos: TipoPuntoLimpio[],
  tipoId: string,
) {
  return findTipoPunto(tipos, tipoId)?.materiales ?? []
}
