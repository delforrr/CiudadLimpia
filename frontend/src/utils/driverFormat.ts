import type { ConductorApi, ContratoApi } from '../services/flotaService.ts'

export type Driver = ConductorApi & { assignedTruck?: string; contrato?: ContratoApi }

export function driverFullName({ nombre, apellido }: ConductorApi) {
  return `${nombre} ${apellido}`
}

export function driverInitials({ nombre, apellido }: ConductorApi) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}
