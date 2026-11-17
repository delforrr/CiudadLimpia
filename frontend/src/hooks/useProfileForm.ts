import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '../services/authService'
import { userService } from '../services/userService'
import { z } from 'zod'
import { nuevoDomicilioSchema, profileSchema, type DomicilioForm, type NuevoDomicilioForm } from '../schemas/profileSchema'
import { capitalizarInicial } from '../utils/capitalizarInicial'

const domicilioVacio: NuevoDomicilioForm = { calle: '', altura: '', etiqueta: '' }

function datosPerfil(user: User | null) {
  return {
    name: capitalizarInicial(user?.cliente?.name ?? ''),
    lastName: capitalizarInicial(user?.cliente?.lastName ?? ''),
    email: user?.email ?? '',
    domicilios: user?.cliente?.domicilios.map(({ id, direccion, etiqueta }): DomicilioForm =>
      ({ id, direccion, etiqueta })) ?? [],
  }
}

export function useProfileForm(
  user: User | null,
  onUpdated: (user: User) => void,
  nuevoDomicilioInicial = false,
) {
  const agregarAlEntrar = nuevoDomicilioInicial && (user?.cliente?.domicilios.length ?? 0) < 20
  const [editando, setEditando] = useState(agregarAlEntrar)
  const [domiciliosExpandidos, setDomiciliosExpandidos] = useState(agregarAlEntrar)
  const [form, setForm] = useState(() => datosPerfil(user))
  const [mensajeExito, setMensajeExito] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string[]>>>({})
  const [domicilioAEliminar, setDomicilioAEliminar] = useState<DomicilioForm | null>(null)
  const [domicilioNuevo, setDomicilioNuevo] = useState<NuevoDomicilioForm | null>(
    agregarAlEntrar ? domicilioVacio : null,
  )
  const [erroresDomicilioNuevo, setErroresDomicilioNuevo] = useState<Partial<Record<keyof NuevoDomicilioForm, string[]>>>({})

  useEffect(() => {
    if (!mensajeExito) return

    const timeout = window.setTimeout(() => setMensajeExito(false), 5000)
    return () => window.clearTimeout(timeout)
  }, [mensajeExito])

  const updateField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    const esNombre = field === 'name' || field === 'lastName'
    const normalized = esNombre && typeof value === 'string' ? capitalizarInicial(value) : value
    setForm((previous) => ({ ...previous, [field]: normalized }))
  }

  const iniciarEdicion = () => {
    setForm(datosPerfil(user))
    setEditando(true)
    setDomiciliosExpandidos(false)
    setMensajeExito(false)
    setError('')
    setFieldErrors({})
    setDomicilioAEliminar(null)
    setDomicilioNuevo(null)
  }

  const iniciarDomicilioNuevo = () => {
    if (pending || form.domicilios.length >= 20 || form.domicilios.some((domicilio) => !domicilio.id)) return

    setErroresDomicilioNuevo({})
    setDomicilioNuevo(domicilioVacio)
  }

  const agregarDomicilioNuevo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!domicilioNuevo) return

    const validation = nuevoDomicilioSchema.safeParse(domicilioNuevo)
    if (!validation.success) {
      setErroresDomicilioNuevo(z.flattenError(validation.error).fieldErrors)
      return
    }

    setForm((previous) => {
      if (previous.domicilios.some((domicilio) => !domicilio.id)) return previous
      return { ...previous, domicilios: [...previous.domicilios, validation.data] }
    })
    setFieldErrors((previous) => ({ ...previous, domicilios: undefined }))
    setDomicilioNuevo(null)
  }

  const confirmarEliminarDomicilio = () => {
    if (!domicilioAEliminar || pending) return

    setForm((previous) => ({
      ...previous,
      domicilios: previous.domicilios.filter((domicilio) => domicilio !== domicilioAEliminar),
    }))
    setDomicilioAEliminar(null)
  }

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || pending) return
    setError('')
    const validation = profileSchema.safeParse(form)
    if (!validation.success) {
      const errors = z.flattenError(validation.error).fieldErrors
      setFieldErrors(errors)
      if (errors.domicilios) setDomiciliosExpandidos(true)
      return
    }
    setFieldErrors({})
    const { email, name, lastName, domicilios } = validation.data
    setPending(true)
    try {
      const updated = await userService.updateProfile(user.id, {
        email,
        cliente: {
          name,
          lastName,
          domicilios,
        },
      })
      onUpdated(updated)
      setEditando(false)
      setMensajeExito(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios',
      )
    } finally {
      setPending(false)
    }
  }

  return {
    editando,
    domiciliosExpandidos,
    setDomiciliosExpandidos,
    form,
    updateField,
    mensajeExito,
    error,
    pending,
    fieldErrors,
    domicilioNuevo,
    erroresDomicilioNuevo,
    iniciarDomicilioNuevo,
    actualizarDomicilioNuevo: (domicilio: NuevoDomicilioForm) => setDomicilioNuevo({
      ...domicilio,
      calle: capitalizarInicial(domicilio.calle),
      etiqueta: capitalizarInicial(domicilio.etiqueta ?? ''),
    }),
    agregarDomicilioNuevo,
    cancelarDomicilioNuevo: () => setDomicilioNuevo(null),
    domicilioAEliminar,
    solicitarEliminarDomicilio: setDomicilioAEliminar,
    cancelarEliminarDomicilio: () => setDomicilioAEliminar(null),
    confirmarEliminarDomicilio,
    iniciarEdicion,
    guardar,
    cancelar: () => setEditando(false),
  }
}
