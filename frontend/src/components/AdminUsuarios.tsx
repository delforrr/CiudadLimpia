import { useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditIcon from '@mui/icons-material/Edit'
import HomeWorkIcon from '@mui/icons-material/HomeWork'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PeopleIcon from '@mui/icons-material/People'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DomiciliosCard from './DomiciliosCard'
import { useAdminUsers, type RoleFilter } from '../hooks/useAdminUsers'
import { useAuthContext } from '../hooks/useAuthContext'
import type { User } from '../services/authService'
import { addressCountLabel, userFullName, userInitials } from '../utils/userFormat'
import './AdminUsuarios.css'

function roleLabel(role: User['role']) {
  return role === 'ADMIN' ? 'Administrador' : 'Vecino'
}

export function AdminUsuarios() {
  const { user: sessionUser, onAuthenticated } = useAuthContext()
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const admin = useAdminUsers((updated) => {
    if (updated.id === sessionUser?.id) onAuthenticated(updated)
  })
  const isEditingSelf = admin.editing?.id === sessionUser?.id

  const stats = [
    {
      label: 'Usuarios totales',
      value: admin.stats.total,
      icon: <PeopleIcon />,
    },
    {
      label: 'Administradores',
      value: admin.stats.admins,
      icon: <AdminPanelSettingsIcon />,
    },
    {
      label: 'Vecinos',
      value: admin.stats.vecinos,
      icon: <PersonIcon />,
    },
    {
      label: 'Domicilios registrados',
      value: admin.stats.domicilios,
      icon: <HomeWorkIcon />,
    },
  ]

  return (
    <section className="admin-users" aria-labelledby="admin-users-title">
      <div className="admin-users-stats">
        {stats.map((stat) => (
          <article className="admin-users-stat" key={stat.label}>
            <span className="admin-users-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-users-stat-label">{stat.label}</span>
              <strong className="admin-users-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-users-panel">
        <div className="admin-users-toolbar">
          <TextField
            className="admin-users-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Nombre, email o domicilio"
            value={admin.search}
            onChange={(event) => admin.setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl size="small" color="success" className="admin-users-filter">
            <InputLabel id="admin-users-role-filter">Rol</InputLabel>
            <Select
              labelId="admin-users-role-filter"
              id="admin-users-role-filter-select"
              label="Rol"
              value={admin.roleFilter}
              onChange={(event) =>
                admin.setRoleFilter(event.target.value as RoleFilter)
              }
            >
              <MenuItem value="TODOS">Todos los roles</MenuItem>
              <MenuItem value="ADMIN">Administradores</MenuItem>
              <MenuItem value="USER">Vecinos</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            color="success"
            className="admin-users-refresh"
            startIcon={<RefreshIcon />}
            onClick={() => void admin.reload()}
            disabled={admin.loading}
          >
            Actualizar
          </Button>
        </div>

        <div className="admin-users-table-header">
          <div>
            <h3 id="admin-users-title">Padrón de usuarios</h3>
            <p>Consultá, editá y administrá las cuentas registradas.</p>
          </div>
          <span className="admin-users-count">
            {admin.filteredUsers.length} de {admin.users.length}
          </span>
        </div>

        {admin.loadError ? (
          <div className="admin-users-state">
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void admin.reload()}
                >
                  Reintentar
                </Button>
              }
            >
              {admin.loadError}
            </Alert>
          </div>
        ) : admin.loading ? (
          <div className="admin-users-loading" aria-label="Cargando usuarios">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} variant="rounded" height={54} />
            ))}
          </div>
        ) : admin.filteredUsers.length === 0 ? (
          <div className="admin-users-empty">
            <PeopleIcon className="admin-users-empty-icon" aria-hidden="true" />
            <h4>
              {admin.users.length === 0
                ? 'Todavía no hay usuarios registrados'
                : 'No encontramos usuarios'}
            </h4>
            <p>
              {admin.users.length === 0
                ? 'Cuando los vecinos se registren van a aparecer en este listado.'
                : 'Probá con otra búsqueda o cambiá el filtro de rol.'}
            </p>
            {(admin.search || admin.roleFilter !== 'TODOS') && (
              <Button color="success" onClick={admin.clearFilters}>Limpiar filtros</Button>
            )}
          </div>
        ) : (
          <TableContainer>
            <Table className="admin-users-table" aria-label="Usuarios registrados">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Domicilios</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admin.filteredUsers.map((user) => {
                  const isSelf = user.id === sessionUser?.id
                  const fullName = userFullName(user)
                  const addressCount = user.cliente?.domicilios.length ?? 0

                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <div className="admin-users-identity">
                          <Avatar
                            className={`admin-users-avatar ${
                              user.role === 'ADMIN' ? 'is-admin' : ''
                            }`}
                          >
                            {userInitials(user)}
                          </Avatar>
                          <div>
                            <span className="admin-users-name">
                              {fullName}
                              {isSelf && (
                                <span className="admin-users-self-badge">
                                  Vos
                                </span>
                              )}
                            </span>
                            <span className="admin-users-email">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={roleLabel(user.role)}
                          className={`admin-users-role ${
                            user.role === 'ADMIN' ? 'is-admin' : 'is-user'
                          }`}
                        />
                      </TableCell>

                      <TableCell>
                        {addressCount > 0 ? (
                          <div>
                            <span className="admin-users-address-count">
                              {addressCountLabel(addressCount)}
                            </span>
                            <span className="admin-users-address">
                              {user.cliente?.domicilios[0]?.direccion}
                            </span>
                          </div>
                        ) : (
                          <span className="admin-users-muted">
                            Sin domicilios
                          </span>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <div className="admin-users-actions">
                          <Tooltip title="Ver detalle">
                            <IconButton
                              size="small"
                              aria-label={`Ver detalle de ${fullName}`}
                              onClick={() => setDetailUser(user)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar usuario">
                            <IconButton
                              size="small"
                              aria-label={`Editar a ${fullName}`}
                              onClick={() => admin.startEdit(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip
                            title={
                              isSelf
                                ? 'No podés eliminar tu propia cuenta'
                                : 'Eliminar usuario'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isSelf}
                                aria-label={`Eliminar a ${fullName}`}
                                onClick={() => admin.requestDelete(user)}
                              >
                                <DeleteOutlineOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      <Dialog
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-users-detail-title"
      >
        <DialogTitle id="admin-users-detail-title">
          Detalle del usuario
        </DialogTitle>
        <DialogContent dividers>
          {detailUser && (
            <>
              <div className="admin-users-detail-header">
                <Avatar
                  className={`admin-users-avatar admin-users-detail-avatar ${
                    detailUser.role === 'ADMIN' ? 'is-admin' : ''
                  }`}
                >
                  {userInitials(detailUser)}
                </Avatar>
                <div>
                  <h3>{userFullName(detailUser)}</h3>
                  <p>{detailUser.email}</p>
                  <Chip
                    size="small"
                    label={roleLabel(detailUser.role)}
                    className={`admin-users-role ${
                      detailUser.role === 'ADMIN' ? 'is-admin' : 'is-user'
                    }`}
                  />
                </div>
              </div>

              <h4 className="admin-users-detail-subtitle">Domicilios</h4>
              {detailUser.cliente?.domicilios.length ? (
                <ul className="admin-users-detail-list">
                  {detailUser.cliente.domicilios.map((domicilio) => (
                    <li
                      className="admin-users-detail-item"
                      key={domicilio.id}
                    >
                      <LocationOnIcon fontSize="small" aria-hidden="true" />
                      <div>
                        <span>{domicilio.direccion}</span>
                        {domicilio.etiqueta && (
                          <small>{domicilio.etiqueta}</small>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-users-muted">
                  Sin domicilios registrados.
                </p>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDetailUser(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(admin.editing)}
        onClose={admin.closeEdit}
        fullWidth
        maxWidth="md"
        aria-labelledby="admin-users-edit-title"
      >
        <DialogTitle id="admin-users-edit-title">Editar usuario</DialogTitle>
        <DialogContent dividers>
          <form
            id="admin-users-form"
            className="admin-users-form"
            onSubmit={admin.save}
            noValidate
          >
            {admin.formError && (
              <div className="admin-users-form-full">
                <Alert severity="error">{admin.formError}</Alert>
              </div>
            )}

            <TextField
              label="Nombre"
              required
              color="success"
              autoComplete="given-name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              disabled={admin.saving}
              error={Boolean(admin.fieldErrors.name)}
              helperText={admin.fieldErrors.name?.[0]}
              value={admin.form.name}
              onChange={(event) =>
                admin.updateField('name', event.target.value)
              }
            />

            <TextField
              label="Apellido"
              required
              color="success"
              autoComplete="family-name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              disabled={admin.saving}
              error={Boolean(admin.fieldErrors.lastName)}
              helperText={admin.fieldErrors.lastName?.[0]}
              value={admin.form.lastName}
              onChange={(event) =>
                admin.updateField('lastName', event.target.value)
              }
            />

            <TextField
              className="admin-users-form-full"
              label="Correo electrónico"
              type="email"
              required
              color="success"
              autoComplete="email"
              slotProps={{ htmlInput: { maxLength: 254 } }}
              disabled={admin.saving}
              error={Boolean(admin.fieldErrors.email)}
              helperText={admin.fieldErrors.email?.[0]}
              value={admin.form.email}
              onChange={(event) =>
                admin.updateField('email', event.target.value)
              }
            />

            <FormControl
              className="admin-users-form-full"
              color="success"
              disabled={admin.saving || isEditingSelf}
            >
              <InputLabel id="admin-users-edit-role">Rol</InputLabel>
              <Select
                labelId="admin-users-edit-role"
                id="admin-users-edit-role-select"
                label="Rol"
                value={admin.form.role}
                onChange={(event) =>
                  admin.updateField('role', event.target.value as User['role'])
                }
              >
                <MenuItem value="USER">Vecino</MenuItem>
                <MenuItem value="ADMIN">Administrador</MenuItem>
              </Select>
              <FormHelperText>
                {isEditingSelf
                  ? 'No podés cambiar tu propio rol.'
                  : 'El rol define los permisos dentro del panel.'}
              </FormHelperText>
            </FormControl>

            <div className="admin-users-form-full">
              <DomiciliosCard
                domicilios={admin.form.domicilios}
                onChange={(domicilios) =>
                  admin.updateField('domicilios', domicilios)
                }
                disabled={admin.saving}
                errors={admin.fieldErrors.domicilios}
                title="Domicilios del usuario"
                emptyText="Sin domicilios registrados. Agregá al menos uno."
              />
            </div>
          </form>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={admin.closeEdit} disabled={admin.saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-users-form"
            variant="contained"
            color="success"
            disabled={admin.saving}
            startIcon={
              admin.saving ? <CircularProgress size={16} /> : <EditIcon />
            }
          >
            {admin.saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(admin.pendingDelete)}
        onClose={admin.cancelDelete}
        fullWidth
        maxWidth="xs"
        aria-labelledby="admin-users-delete-title"
      >
        <DialogTitle id="admin-users-delete-title">
          Eliminar usuario
        </DialogTitle>
        <DialogContent dividers>
          {admin.deleteError && (
            <Alert severity="error" className="admin-users-delete-error">
              {admin.deleteError}
            </Alert>
          )}
          <p>
            ¿Seguro que querés eliminar la cuenta de{' '}
            <strong>
              {admin.pendingDelete ? userFullName(admin.pendingDelete) : ''}
            </strong>
            ? También se eliminarán sus domicilios y esta acción no se puede
            deshacer.
          </p>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={admin.cancelDelete} disabled={admin.deleting}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void admin.confirmDelete()}
            disabled={admin.deleting}
          >
            {admin.deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(admin.notice)}
        autoHideDuration={4000}
        onClose={admin.dismissNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={admin.dismissNotice}
        >
          {admin.notice}
        </Alert>
      </Snackbar>
    </section>
  )
}

export default AdminUsuarios
