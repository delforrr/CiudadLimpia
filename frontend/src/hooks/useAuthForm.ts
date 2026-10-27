import { useState, type SubmitEvent } from 'react'
import { authService, type User } from '../services/authService'
import { authSchema } from '../schemas/authSchema'
import { registerSchema } from '../schemas/registerSchema'

export function useAuthForm(onAuthenticated: (user: User) => void, register = false) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    lastName: '',
    repeatedPassword: '',
    rememberMe: false,
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof typeof form, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const registration = register ? registerSchema.safeParse(form) : null
  const login = !register ? authSchema.safeParse(form) : null
  const validation = registration ?? login!
  const fieldErrors: Partial<Record<keyof typeof form, string[]>> = validation.success
    ? {}
    : (validation.error.flatten().fieldErrors as Partial<Record<keyof typeof form, string[]>>)
  const visibleErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(([field]) => submitted || touched[field as keyof typeof form]),
  )
  const validateField = (field: keyof typeof form) => {
    setTouched((previous) => ({ ...previous, [field]: true }))
  }

  const updateField = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError('')
    setSubmitted(true)
    if (!validation.success) return
    setPending(true)
    try {
      let user: User
      if (register && registration?.success) {
        user = await authService.register({
          email: registration.data.email,
          password: registration.data.password,
          name: registration.data.name,
          lastName: registration.data.lastName,
          repeatedPassword: registration.data.repeatedPassword,
        })
      } else if (!register && login?.success) {
        user = await authService.login({
          email: login.data.email,
          password: login.data.password,
          rememberMe: login.data.rememberMe,
        })
      } else {
        return
      }
      onAuthenticated(user)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : register ? 'No se pudo crear la cuenta' : 'No se pudo iniciar sesión',
      )
    } finally {
      setPending(false)
    }
  }

  return {
    form,
    register,
    error,
    pending,
    fieldErrors: visibleErrors,
    validateField,
    updateField,
    handleSubmit,
  }
}
