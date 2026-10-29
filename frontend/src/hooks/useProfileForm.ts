import { useState, type FormEvent } from 'react'
import type { Domicilio, User } from '../services/authService'
import { userService } from '../services/userService'
import { z } from 'zod'
import { profileSchema } from '../schemas/profileSchema'

export function useProfileForm(
  user: User | null,
  onUpdated: (user: User) => void,
) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    domicilios: [] as Domicilio[],
  })
  const [mensajeExito, setMensajeExito] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string[]>>>({})

  const updateField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const iniciarEdicion = (agregarDomicilio = false) => {
    setForm({
      name: user?.cliente?.name ?? '',
      lastName: user?.cliente?.lastName ?? '',
      email: user?.email ?? '',
      domicilios: [
        ...(user?.cliente?.domicilios.map(({ direccion, etiqueta }) => ({ direccion, etiqueta })) ?? []),
        ...(agregarDomicilio ? [{ direccion: '', etiqueta: '' }] : []),
      ],
    })
    setEditando(true)
    setMensajeExito(false)
    setError('')
    setFieldErrors({})
  }

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || pending) return
    setError('')
    const validation = profileSchema.safeParse(form)
    setFieldErrors(validation.success ? {} : z.flattenError(validation.error).fieldErrors)
    if (!validation.success) return
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
    form,
    updateField,
    mensajeExito,
    error,
    pending,
    fieldErrors,
    iniciarEdicion,
    guardar,
    cancelar: () => setEditando(false),
  }
}
