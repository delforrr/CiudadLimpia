import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { asignacionesCamion, type ContratoConductor } from '../utils/contratoConductor.ts'
import { driverSchema } from '../schemas/driverSchema.ts'
import type { Driver, DriverStatus } from '../utils/driverFormat.ts'

export type StatusFilter = 'TODOS' | DriverStatus

const STORAGE_KEY = 'ciudad-limpia:choferes'

const SEED_DRIVERS: Driver[] = [
  {
    id: 'd-001',
    firstName: 'Carlos',
    lastName: 'González',
    dni: '28456789',
    phone: '02392-456789',
    status: 'ACTIVO',
    assignedTruck: 'Camión 01',
  },
  {
    id: 'd-002',
    firstName: 'Miguel',
    lastName: 'Rodríguez',
    dni: '30123456',
    phone: '02392-523456',
    status: 'ACTIVO',
    assignedTruck: 'Camión 02',
  },
  {
    id: 'd-003',
    firstName: 'Jorge',
    lastName: 'Fernández',
    dni: '27890432',
    phone: '02392-478902',
    status: 'INACTIVO',
    assignedTruck: null,
  },
  {
    id: 'd-004',
    firstName: 'Roberto',
    lastName: 'López',
    dni: '32567890',
    phone: '02392-567890',
    status: 'ACTIVO',
    assignedTruck: 'Camión 03',
  },
]

export type DriverForm = {
  firstName: string
  lastName: string
  dni: string
  phone: string
  status: DriverStatus
  assignedTruck: string
  inicio: string
  fin: string
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function loadDrivers(): Driver[] {
  let drivers = SEED_DRIVERS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length) drivers = parsed
    const rawTrucks = localStorage.getItem('ciudad-limpia:camiones')
    const trucks = rawTrucks ? JSON.parse(rawTrucks) as {
      code: string; assignedDriver?: string; contrato?: ContratoConductor
    }[] : []
    if (!Array.isArray(trucks)) return drivers
    const asignaciones = trucks.flatMap((unidad) =>
      asignacionesCamion(unidad).map((asignacion) => ({ ...asignacion, codigo: unidad.code })),
    )
    return drivers.map((driver): Driver => {
      const nombre = `${driver.firstName} ${driver.lastName}`.trim()
      const asignacion = asignaciones.find((item) => item.nombre === nombre)
      if (asignacion) {
        return { ...driver, status: 'ACTIVO', assignedTruck: asignacion.codigo, contrato: asignacion.contrato }
      }
      if (trucks.some((unidad) => unidad.code === driver.assignedTruck)) {
        return { ...driver, status: 'INACTIVO', assignedTruck: null, contrato: undefined }
      }
      return { ...driver, status: driver.assignedTruck ? 'ACTIVO' : 'INACTIVO' }
    })
  } catch {
    return drivers
  }
}

function saveDrivers(drivers: Driver[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers))
  } catch {
    // ignore storage errors
  }
}

function sincronizarCamiones(nombre: string, codigo: string | null, contrato?: ContratoConductor, nombreAnterior = nombre) {
  try {
    const raw = localStorage.getItem('ciudad-limpia:camiones')
    if (!raw) return
    const trucks = JSON.parse(raw)
    if (!Array.isArray(trucks)) return
    const actualizados = trucks.map((truck: { code: string; assignedDriver?: string; contrato?: ContratoConductor }) => {
      const anteriores = asignacionesCamion(truck)
      const asignaciones = anteriores
        .filter((asignacion) => asignacion.nombre !== nombreAnterior && asignacion.nombre !== nombre)
      if (codigo && truck.code === codigo) {
        asignaciones.push({ nombre, contrato })
      }
      return asignaciones.length === 0 && anteriores.length === 0
        ? truck
        : { ...truck, conductores: asignaciones }
    })
    localStorage.setItem('ciudad-limpia:camiones', JSON.stringify(actualizados))
  } catch {
    // La edición del chofer sigue disponible si el almacenamiento está bloqueado.
  }
}

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>(loadDrivers)
  const loading = false
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS')
  const [editing, setEditing] = useState<Driver | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<DriverForm>({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    status: 'ACTIVO',
    assignedTruck: '',
    inicio: '',
    fin: '',
  })
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof DriverForm, string[]>>
  >({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Driver | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  const filteredDrivers = useMemo(() => {
    const term = normalize(search.trim())
    return drivers
      .filter((driver) => {
        if (statusFilter !== 'TODOS' && driver.status !== statusFilter)
          return false
        if (!term) return true
        const haystack = normalize(
          [
            driver.firstName,
            driver.lastName,
            driver.dni,
            driver.phone,
            driver.assignedTruck ?? '',
          ].join(' '),
        )
        return haystack.includes(term)
      })
      .sort((first, second) =>
        `${first.lastName} ${first.firstName}`.localeCompare(
          `${second.lastName} ${second.firstName}`,
          'es',
        ),
      )
  }, [drivers, search, statusFilter])

  const stats = useMemo(
    () => ({
      total: drivers.length,
      activos: drivers.filter((driver) => driver.status === 'ACTIVO').length,
      inactivos: drivers.filter((driver) => driver.status === 'INACTIVO').length,
    }),
    [drivers],
  )

  const openCreate = useCallback(() => {
    setEditing(null)
    setIsCreating(true)
    setForm({
      firstName: '',
      lastName: '',
      dni: '',
      phone: '',
      status: 'ACTIVO',
      assignedTruck: '',
      inicio: '',
      fin: '',
    })
    setFieldErrors({})
    setFormError('')
  }, [])

  const startEdit = useCallback((driver: Driver) => {
    setIsCreating(false)
    setEditing(driver)
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      dni: driver.dni,
      phone: driver.phone,
      status: driver.status,
      assignedTruck: driver.assignedTruck ?? '',
      inicio: driver.contrato?.inicio ?? '',
      fin: driver.contrato?.fin ?? '',
    })
    setFieldErrors({})
    setFormError('')
  }, [])

  const closeForm = useCallback(() => {
    if (saving) return
    setEditing(null)
    setIsCreating(false)
    setFormError('')
    setFieldErrors({})
  }, [saving])

  const updateField = useCallback(
    <K extends keyof DriverForm>(field: K, value: DriverForm[K]) => {
      setForm((previous) => ({ ...previous, [field]: value }))
    },
    [],
  )

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (saving) return
      setFormError('')
      const validation = driverSchema.safeParse(form)
      setFieldErrors(
        validation.success
          ? {}
          : (z.flattenError(validation.error)
              .fieldErrors as Partial<Record<keyof DriverForm, string[]>>),
      )
      if (!validation.success) return

      const data = validation.data
      const duplicate = drivers.some(
        (driver) =>
          driver.dni === data.dni &&
          driver.id !== (editing?.id ?? ''),
      )
      if (duplicate) {
        setFieldErrors((previous) => ({
          ...previous,
          dni: ['Ya existe un chofer con ese DNI'],
        }))
        return
      }

      setSaving(true)
      try {
        const payload: Driver = {
          id: editing?.id ?? `d-${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          dni: data.dni,
          phone: data.phone,
          status: data.assignedTruck ? 'ACTIVO' : 'INACTIVO',
          assignedTruck: data.assignedTruck?.trim() || null,
          contrato: data.assignedTruck ? { inicio: data.inicio, fin: data.fin || undefined } : undefined,
        }

        setDrivers((previous) => {
          const next = editing
            ? previous.map((driver) =>
                driver.id === editing.id ? payload : driver,
              )
            : [payload, ...previous]
          saveDrivers(next)
          return next
        })

        sincronizarCamiones(`${payload.firstName} ${payload.lastName}`.trim(), payload.assignedTruck ?? null, payload.contrato, editing ? `${editing.firstName} ${editing.lastName}`.trim() : undefined)
        setEditing(null)
        setIsCreating(false)
        setNotice(editing ? 'Chofer actualizado correctamente.' : 'Chofer agregado correctamente.')
      } catch {
        setFormError('No se pudo guardar el chofer')
      } finally {
        setSaving(false)
      }
    },
    [drivers, editing, form, saving],
  )

  const requestDelete = useCallback((driver: Driver) => {
    setPendingDelete(driver)
  }, [])

  const cancelDelete = useCallback(() => {
    if (deleting) return
    setPendingDelete(null)
  }, [deleting])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    const nombre = `${pendingDelete.firstName} ${pendingDelete.lastName}`.trim()
    setDrivers((previous) => {
      const next = previous.filter((driver) => driver.id !== pendingDelete.id)
      saveDrivers(next)
      return next
    })
    sincronizarCamiones(nombre, null, undefined, nombre)
    setPendingDelete(null)
    setNotice('Chofer eliminado correctamente.')
    setDeleting(false)
  }, [deleting, pendingDelete])

  const assignTruck = useCallback(
    (driverId: string, truckCode: string | null, contrato?: ContratoConductor) => {
      const normalizedTruck = truckCode?.trim() || null
      const target = drivers.find((driver) => driver.id === driverId)
      if (!target) return
      const targetName = `${target.firstName} ${target.lastName}`.trim()
      const next = drivers.map((driver): Driver =>
        driver.id === driverId
          ? {
            ...driver,
            status: normalizedTruck ? 'ACTIVO' : 'INACTIVO',
            assignedTruck: normalizedTruck,
            contrato: normalizedTruck ? contrato : undefined,
          }
          : driver,
      )
      setDrivers(next)
      saveDrivers(next)
      sincronizarCamiones(targetName, normalizedTruck, contrato)
      setNotice(normalizedTruck ? `Se asignó ${normalizedTruck} a ${targetName}.` : `Se desvinculó la unidad de ${targetName}.`)
    },
    [drivers],
  )

  return {
    drivers,
    filteredDrivers,
    stats,
    loading,
    search,
    statusFilter,
    setSearch,
    setStatusFilter,
    clearFilters: () => {
      setSearch('')
      setStatusFilter('TODOS')
    },
    openCreate,
    editing,
    isCreating,
    startEdit,
    closeForm,
    form,
    fieldErrors,
    formError,
    saving,
    updateField,
    save,
    assignTruck,
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleting,
    notice,
    dismissNotice: () => setNotice(''),
  }
}
