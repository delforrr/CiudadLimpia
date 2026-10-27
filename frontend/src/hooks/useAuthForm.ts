import { useState, type SubmitEvent } from 'react'
import { authService, type User } from '../services/authService'
import { z } from 'zod'
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
  const validation = registration ?? authSchema.safeParse(form)
  const fieldErrors: Partial<Record<keyof typeof form, string[]>> = validation.success ? {} : z.flattenError(validation.error).fieldErrors
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
      const { email, password, rememberMe } = validation.data
      const user = registration?.success
        ? await authService.register({
            email,
            password,
            name: registration.data.name,
            lastName: registration.data.lastName,
            repeatedPassword: registration.data.repeatedPassword,
          })
        : await authService.login({ email, password, rememberMe })
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
