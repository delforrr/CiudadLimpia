import { useCallback, useState, type FormEvent } from 'react'
import { authService, type User } from '../services/authService'
import { z } from 'zod'
import { loginSchema, registerSchema } from '../schemas/authSchema'

export function useAuthForm(
  onAuthenticated: (user: User) => void,
  initialRegister = false,
) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    lastName: '',
    repeatedPassword: '',
    rememberMe: false,
  })
  const [register, setRegister] = useState(initialRegister)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [lastNameTouched, setLastNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [repeatedPasswordTouched, setRepeatedPasswordTouched] = useState(false)

  const registerResult = registerSchema.safeParse(form)
  const loginResult = loginSchema.safeParse(form)

  const registerErrors = !register || registerResult.success
    ? {}
    : z.flattenError(registerResult.error).fieldErrors

  const loginErrors = register || loginResult.success
    ? {}
    : z.flattenError(loginResult.error).fieldErrors

  const nameError = nameTouched ? registerErrors.name?.[0] ?? '' : ''
  const lastNameError = lastNameTouched ? registerErrors.lastName?.[0] ?? '' : ''
  const emailError = emailTouched
    ? (register ? registerErrors.email?.[0] : loginErrors.email?.[0]) ?? ''
    : ''
  const passwordError = passwordTouched
    ? (register ? registerErrors.password?.[0] : loginErrors.password?.[0]) ?? ''
    : ''
  const repeatedPasswordError = repeatedPasswordTouched
    ? registerErrors.repeatedPassword?.[0] ?? ''
    : ''

  const validateName = () => setNameTouched(true)
  const validateLastName = () => setLastNameTouched(true)
  const validateEmail = () => setEmailTouched(true)
  const validatePassword = () => setPasswordTouched(true)
  const validateRepeatedPassword = () => setRepeatedPasswordTouched(true)

  const updateField = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const resetErrorsAndPasswords = useCallback(() => {
    setError('')
    setNameTouched(false)
    setLastNameTouched(false)
    setEmailTouched(false)
    setPasswordTouched(false)
    setRepeatedPasswordTouched(false)
    setForm((previous) => ({ ...previous, password: '', repeatedPassword: '' }))
  }, [])

  const toggleMode = useCallback(() => {
    setRegister((prev) => !prev)
    resetErrorsAndPasswords()
  }, [resetErrorsAndPasswords])

  const setMode = useCallback((isRegister: boolean) => {
    setRegister(isRegister)
    resetErrorsAndPasswords()
  }, [resetErrorsAndPasswords])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError('')
    setEmailTouched(true)
    setPasswordTouched(true)
    if (register) {
      setNameTouched(true)
      setLastNameTouched(true)
      setRepeatedPasswordTouched(true)
    }

    if (register) {
      if (!registerResult.success) return
      setPending(true)
      try {
        const { email, password, name, lastName, repeatedPassword } =
          registerResult.data
        const user = await authService.register({
          email,
          password,
          name,
          lastName,
          repeatedPassword,
        })
        onAuthenticated(user)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo crear la cuenta',
        )
      } finally {
        setPending(false)
      }
    } else {
      if (!loginResult.success) return
      setPending(true)
      try {
        const { email, password, rememberMe } = loginResult.data
        const user = await authService.login({ email, password, rememberMe })
        onAuthenticated(user)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión',
        )
      } finally {
        setPending(false)
      }
    }
  }

  return {
    form,
    register,
    error,
    pending,
    nameError,
    lastNameError,
    emailError,
    passwordError,
    repeatedPasswordError,
    validateName,
    validateLastName,
    validateEmail,
    validatePassword,
    validateRepeatedPassword,
    updateField,
    toggleMode,
    setMode,
    handleSubmit,
  }
}

