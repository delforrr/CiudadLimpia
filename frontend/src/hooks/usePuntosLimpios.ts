import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { puntosLimpiosService } from '../services/puntosLimpiosService'
import { trayectosService } from '../services/trayectosService'
import { puntoLimpioSchema } from '../schemas/puntoLimpioSchema.ts'
import {
  findTipoPunto,
  type EstadoPuntoLimpio,
  type PuntoLimpioAdmin,
} from '../utils/puntosLimpiosFormat.ts'
import { useCatalogoPuntosLimpios } from './useCatalogoPuntosLimpios'

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
  const { tipos, puntos, setCatalogo, loading, error } = useCatalogoPuntosLimpios(true)
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
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const [calle, setCalle] = useState('')
  const [altura, setAltura] = useState('')
  const busquedaDireccion = useRef<AbortController | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PuntoLimpioAdmin | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => () => busquedaDireccion.current?.abort(), [])

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
    busquedaDireccion.current?.abort()
    setUbicacion(null)
    setCalle('')
    setAltura('')
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
    busquedaDireccion.current?.abort()
    setUbicacion(punto.lat !== undefined && punto.lng !== undefined ? { lat: punto.lat, lng: punto.lng } : null)
    const partes = punto.direccion.match(/^(.*?)\s+(\d+)$/)
    setCalle(partes?.[1] ?? punto.direccion)
    setAltura(partes?.[2] ?? '')
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
    busquedaDireccion.current?.abort()
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

  const validarFormulario = useCallback(() => {
      setFormError('')
      const validation = puntoLimpioSchema.safeParse(form)
      setFieldErrors(
        validation.success
          ? {}
          : (z.flattenError(validation.error)
              .fieldErrors as Partial<Record<keyof PuntoLimpioForm, string[]>>),
      )
      if (!validation.success) return null
      if (!calle.trim() || !/^\d+$/.test(altura)) {
        setFormError('Ingresá la calle y la altura.')
        return null
      }
      return validation.data
  }, [form, calle, altura])

  const save = useCallback(
    async () => {
      if (saving) return false
      const data = validarFormulario()
      if (!data) return false
      if (!ubicacion) {
        setFormError('Marcá la ubicación del punto en el mapa.')
        return false
      }

      setSaving(true)
      try {
        const cambioFrente = !editing || data.direccion !== editing.direccion ||
          ubicacion.lat !== editing.lat || ubicacion.lng !== editing.lng
        const guardado = await puntosLimpiosService.guardarPunto({
          nombre: data.nombre, tipoId: data.tipoId, estado: data.estado,
          ...(cambioFrente && {
            direccion: { calle: calle.trim(), altura: Number(altura) },
            lat: ubicacion.lat, long: ubicacion.lng,
          }),
        }, editing?.id)
        setCatalogo((anterior) => ({
          ...anterior, puntos: [guardado, ...anterior.puntos.filter(({ id }) => id !== guardado.id)],
        }))

        setEditing(null)
        setIsCreating(false)
        setNotice(
          editing
            ? 'Punto limpio actualizado correctamente.'
            : 'Punto limpio agregado correctamente.',
        )
        return true
      } catch {
        setFormError('No se pudo guardar el punto limpio')
        return false
      } finally {
        setSaving(false)
      }
    },
    [editing, saving, ubicacion, calle, altura, setCatalogo, validarFormulario],
  )

  const requestDelete = useCallback((punto: PuntoLimpioAdmin) => {
    setPendingDelete(punto)
    setDeleteError('')
  }, [])

  const cancelDelete = useCallback(() => {
    if (deleting) return
    setPendingDelete(null)
  }, [deleting])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await puntosLimpiosService.eliminarPunto(pendingDelete.id)
      setCatalogo((anterior) => ({
        ...anterior, puntos: anterior.puntos.filter(({ id }) => id !== pendingDelete.id),
      }))
      setPendingDelete(null)
      setNotice('Punto limpio eliminado correctamente.')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar el registro.')
    } finally {
      setDeleting(false)
    }
  }, [deleting, pendingDelete, setCatalogo])

  return {
    error,
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
    ubicacion,
    setUbicacion: (nuevaUbicacion: { lat: number; lng: number }) => {
      busquedaDireccion.current?.abort()
      setUbicacion(nuevaUbicacion)
    },
    calle,
    altura,
    actualizarDireccion: (nuevaCalle: string, nuevaAltura: string) => {
      busquedaDireccion.current?.abort()
      setUbicacion(null)
      setCalle(nuevaCalle)
      setAltura(nuevaAltura)
      setForm((previous) => ({ ...previous, direccion: [nuevaCalle.trim(), nuevaAltura.trim()].filter(Boolean).join(' ') }))
    },
    buscarDireccion: async () => {
      if (!calle.trim() || !/^\d+$/.test(altura)) return 'no-encontrada' as const
      busquedaDireccion.current?.abort()
      const solicitud = new AbortController()
      busquedaDireccion.current = solicitud
      try {
        const resultado = await trayectosService.buscar(calle.trim(), Number(altura), solicitud.signal)
        if (solicitud.signal.aborted) return 'cancelada' as const
        const coincidencia = resultado.sugerencias.find((sugerencia) => sugerencia.altura === Number(altura))
        if (coincidencia) {
          setUbicacion({ lat: coincidencia.lat, lng: coincidencia.long })
          return 'encontrada' as const
        }
        return 'no-encontrada' as const
      } catch {
        return solicitud.signal.aborted ? 'cancelada' as const : 'error' as const
      }
    },
    cancelarBusquedaDireccion: () => busquedaDireccion.current?.abort(),
    validarFormulario,
    save,
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleteError,
    deleting,
    notice,
    dismissNotice: () => setNotice(''),
  }
}
