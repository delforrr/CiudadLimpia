import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { tipoPuntoLimpioSchema } from '../schemas/tipoPuntoLimpioSchema.ts'
import type {
  PuntoLimpioAdmin,
  TipoPuntoLimpio,
} from '../utils/puntosLimpiosFormat.ts'
import {
  loadPuntos,
  loadTipos,
  saveTipos,
} from '../utils/puntosLimpiosStorage.ts'
import { APP_LOGOS_PUNTOS_LIMPIOS, puntoLimpioLogoColor } from '../utils/puntosLimpiosLogos.ts'

export type TipoPuntoLimpioForm = {
  nombre: string
  materiales: string[]
  logo?: string
  colorFondo: string
}

const EMPTY_FORM: TipoPuntoLimpioForm = {
  nombre: '',
  materiales: [''],
  logo: APP_LOGOS_PUNTOS_LIMPIOS[0].src,
  colorFondo: puntoLimpioLogoColor(APP_LOGOS_PUNTOS_LIMPIOS[0].src),
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function useTiposPuntosLimpios() {
  const [initial] = useState(() => {
    const tipos = loadTipos()
    return { tipos, puntos: loadPuntos(tipos) }
  })
  const [tipos, setTipos] = useState<TipoPuntoLimpio[]>(initial.tipos)
  const puntos: PuntoLimpioAdmin[] = initial.puntos
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<TipoPuntoLimpio | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<TipoPuntoLimpioForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string[] }>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<TipoPuntoLimpio | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  const usageCount = useCallback(
    (tipoId: string) =>
      puntos.filter((punto) => punto.tipoId === tipoId).length,
    [puntos],
  )

  const filteredTipos = useMemo(() => {
    const term = normalize(search.trim())
    return tipos
      .filter((tipo) => {
        if (!term) return true
        const haystack = normalize(
          [tipo.nombre, ...tipo.materiales].join(' '),
        )
        return haystack.includes(term)
      })
      .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'))
  }, [tipos, search])

  const stats = useMemo(
    () => ({
      total: tipos.length,
      materiales: tipos.reduce(
        (total, tipo) => total + tipo.materiales.length,
        0,
      ),
      puntosAsignados: puntos.length,
    }),
    [tipos, puntos],
  )

  const openCreate = useCallback(() => {
    setEditing(null)
    setIsCreating(true)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setFormError('')
  }, [])

  const startEdit = useCallback((tipo: TipoPuntoLimpio) => {
    setIsCreating(false)
    setEditing(tipo)
    setForm({
      nombre: tipo.nombre,
      materiales: [...tipo.materiales],
      logo: tipo.logo ?? APP_LOGOS_PUNTOS_LIMPIOS[0].src,
      colorFondo: tipo.colorFondo ?? puntoLimpioLogoColor(tipo.logo),
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

  const updateNombre = useCallback((nombre: string) => {
    setForm((previous) => ({ ...previous, nombre }))
  }, [])

  const updateLogo = useCallback((logo: string) => {
    setForm((previous) => ({ ...previous, logo }))
  }, [])

  const updateColorFondo = useCallback((colorFondo: string) => {
    setForm((previous) => ({ ...previous, colorFondo }))
  }, [])

  const updateMaterial = useCallback((index: number, value: string) => {
    setForm((previous) => ({
      ...previous,
      materiales: previous.materiales.map((material, position) =>
        position === index ? value : material,
      ),
    }))
  }, [])

  const addMaterial = useCallback(() => {
    setForm((previous) => ({
      ...previous,
      materiales: [...previous.materiales, ''],
    }))
  }, [])

  const removeMaterial = useCallback((index: number) => {
    setForm((previous) => ({
      ...previous,
      materiales: previous.materiales.filter(
        (_, position) => position !== index,
      ),
    }))
  }, [])

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (saving) return
      setFormError('')
      setFieldErrors({})

      const validation = tipoPuntoLimpioSchema.safeParse(form)
      if (!validation.success) {
        const issues = validation.error.issues
        const nombreIssue = issues.find((issue) => issue.path[0] === 'nombre')
        setFieldErrors(nombreIssue ? { nombre: [nombreIssue.message] } : {})
        setFormError(issues[0]?.message ?? 'Revisá los datos del tipo.')
        return
      }

      const data = validation.data
      const duplicateName = tipos.some(
        (tipo) =>
          tipo.id !== editing?.id &&
          normalize(tipo.nombre) === normalize(data.nombre),
      )
      if (duplicateName) {
        setFieldErrors({ nombre: ['Ya existe un tipo con ese nombre'] })
        return
      }

      const vistos = new Set<string>()
      for (const material of data.materiales) {
        const key = normalize(material)
        if (vistos.has(key)) {
          setFormError('No repitas materiales dentro del mismo tipo.')
          return
        }
        vistos.add(key)
      }

      setSaving(true)
      try {
        const payload: TipoPuntoLimpio = {
          id: editing?.id ?? `tipo-${Date.now()}`,
          nombre: data.nombre,
          materiales: data.materiales,
          logo: form.logo?.trim() || undefined,
          colorFondo: data.colorFondo,
        }

        setTipos((previous) => {
          const next = editing
            ? previous.map((tipo) =>
                tipo.id === editing.id ? payload : tipo,
              )
            : [...previous, payload]
          saveTipos(next)
          return next
        })

        setEditing(null)
        setIsCreating(false)
        setNotice(
          editing
            ? 'Tipo de punto limpio actualizado correctamente.'
            : 'Tipo de punto limpio agregado correctamente.',
        )
      } catch {
        setFormError('No se pudo guardar el tipo de punto limpio')
      } finally {
        setSaving(false)
      }
    },
    [editing, form, saving, tipos],
  )

  const requestDelete = useCallback((tipo: TipoPuntoLimpio) => {
    setPendingDelete(tipo)
    setDeleteError('')
  }, [])

  const cancelDelete = useCallback(() => {
    if (deleting) return
    setPendingDelete(null)
    setDeleteError('')
  }, [deleting])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete || deleting) return
    if (tipos.length <= 1) {
      setDeleteError('Debe quedar al menos un tipo de punto limpio.')
      return
    }
    const count = usageCount(pendingDelete.id)
    if (count > 0) {
      setDeleteError(
        `No se puede eliminar: ${count} ${
          count === 1 ? 'punto usa' : 'puntos usan'
        } este tipo.`,
      )
      return
    }

    setDeleting(true)
    setTipos((previous) => {
      const next = previous.filter((tipo) => tipo.id !== pendingDelete.id)
      saveTipos(next)
      return next
    })
    setPendingDelete(null)
    setDeleteError('')
    setNotice('Tipo de punto limpio eliminado correctamente.')
    setDeleting(false)
  }, [deleting, pendingDelete, tipos.length, usageCount])

  return {
    tipos,
    filteredTipos,
    stats,
    search,
    setSearch,
    usageCount,
    openCreate,
    editing,
    isCreating,
    startEdit,
    closeForm,
    form,
    fieldErrors,
    formError,
    saving,
    updateNombre,
    updateLogo,
    updateColorFondo,
    updateMaterial,
    addMaterial,
    removeMaterial,
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
