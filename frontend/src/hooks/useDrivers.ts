import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { driverSchema } from '../schemas/driverSchema'
import type { ConductorApi, ConductorDatos, ContratoApi } from '../services/flotaService'
import { driverFullName, type Driver } from '../utils/driverFormat'
import { useFlota } from './useFlota'

export type StatusFilter = 'TODOS' | 'ACTIVO' | 'INACTIVO'
const formularioInicial: ConductorDatos = { nombre: '', apellido: '', activo: true }

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function useDrivers() {
  const flota = useFlota()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS')
  const [editing, setEditing] = useState<ConductorApi | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(formularioInicial)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ConductorDatos, string[]>>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ConductorApi | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [contratoError, setContratoError] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [notice, setNotice] = useState('')

  const camiones = new Map(flota.camiones.map(({ id, patente }) => [id, patente]))
  const drivers: Driver[] = flota.conductores.map((conductor) => {
    const contrato = flota.contratos.find(({ idConductor }) => idConductor === conductor.id)
    return { ...conductor, contrato, assignedTruck: contrato && camiones.get(contrato.idCamion) }
  })
  const term = normalize(search.trim())
  const filteredDrivers = drivers.filter((driver) =>
    (statusFilter === 'TODOS' || driver.activo === (statusFilter === 'ACTIVO')) &&
    normalize(`${driverFullName(driver)} ${driver.assignedTruck ?? ''}`).includes(term),
  ).sort((first, second) =>
    `${first.apellido} ${first.nombre}`.localeCompare(`${second.apellido} ${second.nombre}`, 'es'),
  )

  const abrirFormulario = (conductor?: ConductorApi) => {
    setEditing(conductor ?? null)
    setIsCreating(!conductor)
    setForm(conductor ?? formularioInicial)
    setFieldErrors({})
    setFormError('')
  }
  const closeForm = () => {
    if (saving) return
    setEditing(null)
    setIsCreating(false)
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const validation = driverSchema.safeParse(form)
    setFieldErrors(validation.success ? {} : z.flattenError(validation.error).fieldErrors)
    setFormError('')
    if (!validation.success) return

    setSaving(true)
    try {
      await flota.guardarConductor(validation.data, editing?.id)
      setEditing(null)
      setIsCreating(false)
      setNotice(editing ? 'Chofer actualizado correctamente.' : 'Chofer agregado correctamente.')
    } catch (fallo) {
      setFormError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el chofer.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    setDeleteError('')
    setDeleting(true)
    try {
      await flota.darDeBajaConductor(pendingDelete.id)
      setPendingDelete(null)
      setNotice('Se dio de baja al chofer.')
    } catch (fallo) {
      setDeleteError(fallo instanceof Error ? fallo.message : 'No se pudo dar de baja al chofer.')
    } finally {
      setDeleting(false)
    }
  }

  const finalizarContrato = async (contrato: ContratoApi) => {
    if (finalizando) return
    setFinalizando(true)
    setContratoError('')
    try {
      await flota.finalizar(contrato)
      setNotice('Se finalizó el contrato.')
    } catch (fallo) {
      setContratoError(fallo instanceof Error ? fallo.message : 'No se pudo finalizar el contrato.')
    } finally {
      setFinalizando(false)
    }
  }

  return {
    ...flota,
    drivers, filteredDrivers,
    stats: {
      total: drivers.length,
      activos: drivers.filter(({ activo }) => activo).length,
      inactivos: drivers.filter(({ activo }) => !activo).length,
    },
    search, setSearch, statusFilter, setStatusFilter,
    clearFilters: () => {
      setSearch('')
      setStatusFilter('TODOS')
    },
    openCreate: () => abrirFormulario(),
    startEdit: abrirFormulario,
    editing, isCreating, closeForm, form, fieldErrors, formError, saving, save,
    updateField: <K extends keyof ConductorDatos>(field: K, value: ConductorDatos[K]) =>
      setForm((previous) => ({ ...previous, [field]: value })),
    pendingDelete,
    requestDelete: (conductor: ConductorApi) => {
      setDeleteError('')
      setPendingDelete(conductor)
    },
    cancelDelete: () => { if (!deleting) setPendingDelete(null) },
    confirmDelete, deleting, deleteError,
    finalizarContrato, finalizando, contratoError, setContratoError,
    notice, setNotice, dismissNotice: () => setNotice(''),
  }
}
