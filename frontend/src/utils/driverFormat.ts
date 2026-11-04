export type DriverStatus = 'ACTIVO' | 'INACTIVO'

export interface Driver {
  id: string
  firstName: string
  lastName: string
  dni: string
  phone: string
  status: DriverStatus
  assignedTruck?: string | null
}

export function driverFullName(driver: Driver) {
  return `${driver.firstName} ${driver.lastName}`.trim()
}

export function driverInitials(driver: Driver) {
  if (driver.firstName && driver.lastName) {
    return `${driver.firstName[0]}${driver.lastName[0]}`.toUpperCase()
  }
  return driver.dni.slice(0, 2).toUpperCase()
}

export function statusLabel(status: DriverStatus) {
  switch (status) {
    case 'ACTIVO':
      return 'Activo'
    case 'INACTIVO':
      return 'Inactivo'
    default:
      return status
  }
}
