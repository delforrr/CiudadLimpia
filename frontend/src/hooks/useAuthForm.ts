import { useState, type SubmitEvent } from 'react'
import { authService, type User } from '../services/authService'
import { z } from 'zod'
import { authSchema } from '../schemas/authSchema'

export function useAuthForm(onAuthenticated: (user: User) => void) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    lastName: '',
    repeatedPassword: '',
    rememberMe: false,
  })
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const validation = authSchema.safeParse(form)
  const fieldErrors = validation.success ? {} : z.flattenError(validation.error).fieldErrors
  const emailError = emailTouched ? fieldErrors.email?.[0] ?? '' : ''
  const passwordError = passwordTouched ? fieldErrors.password?.[0] ?? '' : ''
  const validateEmail = () => setEmailTouched(true)
  const validatePassword = () => setPasswordTouched(true)

  const updateField = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const toggleMode = () => {
    setRegister(!register)
    setError('')
    setEmailTouched(false)
    setPasswordTouched(false)
    setForm((previous) => ({ ...previous, password: '', repeatedPassword: '' }))
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError('')
    setEmailTouched(true)
    setPasswordTouched(true)
    if (!validation.success) return
    if (register && form.password !== form.repeatedPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setPending(true)
    try {
      const { email, password, rememberMe } = validation.data
      const { name, lastName, repeatedPassword } = form
      const user = register
        ? await authService.register({
            email,
            password,
            name,
            lastName,
            repeatedPassword,
          })
        : await authService.login({ email, password, rememberMe })
      onAuthenticated(user)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión',
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
    emailError,
    passwordError,
    validateEmail,
    validatePassword,
    updateField,
    toggleMode,
    handleSubmit,
  }
}
