import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { puntoLimpioSchema } from '../schemas/puntoLimpioSchema.ts'
import {
  findTipoPunto,
  type EstadoPuntoLimpio,
  type PuntoLimpioAdmin,
} from '../utils/puntosLimpiosFormat.ts'
import {
  loadPuntos,
  loadTipos,
  savePuntos,
} from '../utils/puntosLimpiosStorage.ts'

export type TipoFilter = 'TODOS' | string
export type EstadoFilter = 'TODOS' | EstadoPuntoLimpio

export type PuntoLimpioForm = {
  nombre: string
  tipoId: string
  direccion: string
  estado: EstadoPuntoLimpio
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function usePuntosLimpios() {
  const [initial] = useState(() => {
    const tipos = loadTipos()
    return { tipos, puntos: loadPuntos(tipos) }
  })
  const tipos = initial.tipos
  const [puntos, setPuntos] = useState<PuntoLimpioAdmin[]>(initial.puntos)
  const loading = false
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('TODOS')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS')
  const [editing, setEditing] = useState<PuntoLimpioAdmin | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<PuntoLimpioForm>({
    nombre: '',
    tipoId: '',
    direccion: '',
    estado: 'ACTIVO',
  })
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PuntoLimpioForm, string[]>>
  >({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PuntoLimpioAdmin | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  const filteredPuntos = useMemo(() => {
    const term = normalize(search.trim())
    return puntos
      .filter((punto) => {
        if (tipoFilter !== 'TODOS' && punto.tipoId !== tipoFilter) return false
        if (estadoFilter !== 'TODOS' && punto.estado !== estadoFilter) return false
        if (!term) return true
        const tipo = findTipoPunto(tipos, punto.tipoId)
        const haystack = normalize(
          [
            punto.nombre,
            punto.direccion,
            tipo?.nombre ?? '',
            ...(tipo?.materiales ?? []),
          ].join(' '),
        )
        return haystack.includes(term)
      })
      .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'))
  }, [puntos, tipos, search, tipoFilter, estadoFilter])

  const stats = useMemo(() => {
    const porTipo: Record<string, number> = {}
    for (const tipo of tipos) porTipo[tipo.id] = 0
    for (const punto of puntos) {
      porTipo[punto.tipoId] = (porTipo[punto.tipoId] ?? 0) + 1
    }
    return {
      total: puntos.length,
      activos: puntos.filter((punto) => punto.estado === 'ACTIVO').length,
      inactivos: puntos.filter((punto) => punto.estado === 'INACTIVO').length,
      porTipo,
    }
  }, [puntos, tipos])

  const openCreate = useCallback(() => {
    setEditing(null)
    setIsCreating(true)
    setForm({
      nombre: '',
      tipoId: '',
      direccion: '',
      estado: 'ACTIVO',
    })
    setFieldErrors({})
    setFormError('')
  }, [])

  const startEdit = useCallback((punto: PuntoLimpioAdmin) => {
    setIsCreating(false)
    setEditing(punto)
    setForm({
      nombre: punto.nombre,
      tipoId: punto.tipoId,
      direccion: punto.direccion,
      estado: punto.estado,
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
    <K extends keyof PuntoLimpioForm>(field: K, value: PuntoLimpioForm[K]) => {
      setForm((previous) => ({ ...previous, [field]: value }))
    },
    [],
  )

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (saving) return
      setFormError('')
      const validation = puntoLimpioSchema.safeParse(form)
      setFieldErrors(
        validation.success
          ? {}
          : (z.flattenError(validation.error)
              .fieldErrors as Partial<Record<keyof PuntoLimpioForm, string[]>>),
      )
      if (!validation.success) return

      const data = validation.data
      setSaving(true)
      try {
        const payload: PuntoLimpioAdmin = {
          id: editing?.id ?? `pl-${Date.now()}`,
          nombre: data.nombre,
          tipoId: data.tipoId,
          direccion: data.direccion,
          estado: editing ? data.estado : 'ACTIVO',
        }

        setPuntos((previous) => {
          const next = editing
            ? previous.map((punto) =>
                punto.id === editing.id ? payload : punto,
              )
            : [payload, ...previous]
          savePuntos(next)
          return next
        })

        setEditing(null)
        setIsCreating(false)
        setNotice(
          editing
            ? 'Punto limpio actualizado correctamente.'
            : 'Punto limpio agregado correctamente.',
        )
      } catch {
        setFormError('No se pudo guardar el punto limpio')
      } finally {
        setSaving(false)
      }
    },
    [editing, form, saving],
  )

  const requestDelete = useCallback((punto: PuntoLimpioAdmin) => {
    setPendingDelete(punto)
  }, [])

  const cancelDelete = useCallback(() => {
    if (deleting) return
    setPendingDelete(null)
  }, [deleting])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    setPuntos((previous) => {
      const next = previous.filter((punto) => punto.id !== pendingDelete.id)
      savePuntos(next)
      return next
    })
    setPendingDelete(null)
    setNotice('Punto limpio eliminado correctamente.')
    setDeleting(false)
  }, [deleting, pendingDelete])

  return {
    puntos,
    tipos,
    filteredPuntos,
    stats,
    loading,
    search,
    tipoFilter,
    estadoFilter,
    setSearch,
    setTipoFilter,
    setEstadoFilter,
    clearFilters: () => {
      setSearch('')
      setTipoFilter('TODOS')
      setEstadoFilter('TODOS')
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
