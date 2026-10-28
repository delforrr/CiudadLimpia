import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
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
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function loadDrivers(): Driver[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED_DRIVERS
    const parsed = JSON.parse(raw) as Driver[]
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_DRIVERS
    return parsed
  } catch {
    return SEED_DRIVERS
  }
}

function saveDrivers(drivers: Driver[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers))
  } catch {
    // ignore storage errors
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
          status: data.status,
          assignedTruck: data.assignedTruck?.trim() || null,
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
    setDrivers((previous) => {
      const next = previous.filter((driver) => driver.id !== pendingDelete.id)
      saveDrivers(next)
      return next
    })
    setPendingDelete(null)
    setNotice('Chofer eliminado correctamente.')
    setDeleting(false)
  }, [deleting, pendingDelete])

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
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleting,
    notice,
    dismissNotice: () => setNotice(''),
  }
}
