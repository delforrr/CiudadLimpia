import { useState, type FormEvent } from 'react'
import type { User } from '../services/authService'
import { userService } from '../services/userService'

export function useProfileForm(
  user: User | null,
  onUpdated: (user: User) => void,
) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    direccion: '',
  })
  const [mensajeExito, setMensajeExito] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const iniciarEdicion = () => {
    setForm({
      name: user?.cliente?.name ?? '',
      lastName: user?.cliente?.lastName ?? '',
      email: user?.email ?? '',
      direccion:
        user?.cliente?.domicilios
          .map(({ direccion }) => direccion)
          .join('\n') ?? '',
    })
    setEditando(true)
    setMensajeExito(false)
    setError('')
  }

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || pending) return
    setError('')
    setPending(true)
    try {
      const updated = await userService.updateProfile(user.id, {
        email: form.email,
        cliente: {
          name: form.name,
          lastName: form.lastName,
          domicilios: form.direccion
            .split('\n')
            .map((direccion) => direccion.trim())
            .filter(Boolean)
            .map((direccion) => ({ direccion })),
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
    iniciarEdicion,
    guardar,
    cancelar: () => setEditando(false),
  }
}
