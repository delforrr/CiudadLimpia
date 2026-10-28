import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { adminUserSchema } from '../schemas/adminUserSchema.ts'
import type { Domicilio, User } from '../services/authService.ts'
import { userService } from '../services/userService.ts'
import { userFullName } from '../utils/userFormat.ts'

export type RoleFilter = 'TODOS' | User['role']

export type AdminUserForm = {
  name: string
  lastName: string
  email: string
  role: User['role']
  domicilios: Domicilio[]
}

const EMPTY_ADDRESS: Domicilio = { direccion: '', etiqueta: '' }

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function loadErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No se pudieron cargar los usuarios'
}

export function useAdminUsers(onUpdated?: (user: User) => void) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('TODOS')
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<AdminUserForm>({
    name: '',
    lastName: '',
    email: '',
    role: 'USER',
    domicilios: [EMPTY_ADDRESS],
  })
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AdminUserForm, string[]>>
  >({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      setUsers(await userService.list())
      setLoadError('')
    } catch (error) {
      setLoadError(loadErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
    setLoadError('')
    void load()
  }, [load])

  useEffect(() => {
    let active = true
    userService
      .list()
      .then((data) => {
        if (!active) return
        setUsers(data)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (active) setLoadError(loadErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const term = normalize(search.trim())
    return users
      .filter((user) => {
        if (roleFilter !== 'TODOS' && user.role !== roleFilter) return false
        if (!term) return true
        const haystack = normalize(
          [
            user.email,
            user.cliente?.name ?? '',
            user.cliente?.lastName ?? '',
            ...(user.cliente?.domicilios.map((domicilio) => domicilio.direccion) ?? []),
          ].join(' '),
        )
        return haystack.includes(term)
      })
      .sort((first, second) =>
        userFullName(first).localeCompare(userFullName(second), 'es'),
      )
  }, [users, search, roleFilter])

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      vecinos: users.filter((user) => user.role === 'USER').length,
      domicilios: users.reduce(
        (total, user) => total + (user.cliente?.domicilios.length ?? 0),
        0,
      ),
    }),
    [users],
  )

  const startEdit = (user: User) => {
    setEditing(user)
    setForm({
      name: user.cliente?.name ?? '',
      lastName: user.cliente?.lastName ?? '',
      email: user.email,
      role: user.role,
      domicilios: user.cliente?.domicilios.length
        ? user.cliente.domicilios.map(({ direccion, etiqueta }) => ({
            direccion,
            etiqueta,
          }))
        : [{ ...EMPTY_ADDRESS }],
    })
    setFieldErrors({})
    setFormError('')
  }

  const closeEdit = () => {
    if (saving) return
    setEditing(null)
    setFormError('')
    setFieldErrors({})
  }

  const updateField = <K extends keyof AdminUserForm>(
    field: K,
    value: AdminUserForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing || saving) return
    setFormError('')
    const validation = adminUserSchema.safeParse(form)
    setFieldErrors(
      validation.success
        ? {}
        : (z.flattenError(validation.error)
            .fieldErrors as Partial<Record<keyof AdminUserForm, string[]>>),
    )
    if (!validation.success) return
    setSaving(true)
    try {
      const { name, lastName, email, role, domicilios } = validation.data
      const updated = await userService.update(editing.id, {
        email,
        role,
        cliente: { name, lastName, domicilios },
      })
      setUsers((previous) =>
        previous.map((user) => (user.id === updated.id ? updated : user)),
      )
      onUpdated?.(updated)
      setEditing(null)
      setNotice('Usuario actualizado correctamente.')
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el usuario',
      )
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (user: User) => {
    setPendingDelete(user)
    setDeleteError('')
  }

  const cancelDelete = () => {
    if (deleting) return
    setPendingDelete(null)
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await userService.remove(pendingDelete.id)
      setUsers((previous) =>
        previous.filter((user) => user.id !== pendingDelete.id),
      )
      setPendingDelete(null)
      setNotice('Usuario eliminado correctamente.')
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el usuario',
      )
    } finally {
      setDeleting(false)
    }
  }

  return {
    users,
    filteredUsers,
    stats,
    loading,
    loadError,
    search,
    roleFilter,
    setSearch,
    setRoleFilter,
    clearFilters: () => {
      setSearch('')
      setRoleFilter('TODOS')
    },
    reload,
    editing,
    form,
    fieldErrors,
    formError,
    saving,
    startEdit,
    closeEdit,
    updateField,
    save,
    pendingDelete,
    deleteError,
    deleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
    notice,
    dismissNotice: () => setNotice(''),
  }
}
