import { useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
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
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'
import PhoneIcon from '@mui/icons-material/Phone'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useDrivers, type StatusFilter } from '../hooks/useDrivers'
import type { Driver } from '../utils/driverFormat'
import {
  driverFullName,
  driverInitials,
  statusLabel,
} from '../utils/driverFormat'
import './AdminChoferes.css'

interface SystemTruckOption {
  code: string
  label: string
}

function loadSystemTruckOptions(): SystemTruckOption[] {
  const fallback: SystemTruckOption[] = [
    { code: 'Camión 01', label: 'Camión 01 - Iveco Tector 170E28 (AE 123 CD)' },
    { code: 'Camión 02', label: 'Camión 02 - Mercedes-Benz Atego 1726 (AF 456 TL)' },
    { code: 'Camión 03', label: 'Camión 03 - Volkswagen Constellation (AD 789 ZX)' },
    { code: 'Camión 04', label: 'Camión 04 - Ford Cargo 1722 (AC 321 QR)' },
  ]
  try {
    const raw = localStorage.getItem('ciudad-limpia:camiones')
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    return parsed
      .map((t: { code?: string; brand?: string; model?: string; plate?: string }) => ({
        code: t.code || '',
        label: `${t.code ?? 'Camión'}${t.brand ? ` - ${t.brand}` : ''}${t.model ? ` ${t.model}` : ''}${t.plate ? ` (${t.plate})` : ''}`,
      }))
      .filter((t: SystemTruckOption) => Boolean(t.code))
  } catch {
    return fallback
  }
}

function statusChipClass(status: Driver['status']) {
  if (status === 'ACTIVO') return 'is-active'
  return 'is-inactive'
}

export function AdminChoferes() {
  const drivers = useDrivers()
  const [detailDriver, setDetailDriver] = useState<Driver | null>(null)
  const [assignAnchor, setAssignAnchor] = useState<null | HTMLElement>(null)
  const [targetDriver, setTargetDriver] = useState<Driver | null>(null)
  const isEditing = Boolean(drivers.editing) || drivers.isCreating
  const systemTrucks = useMemo(() => loadSystemTruckOptions(), [])

  const handleOpenAssignMenu = (
    event: React.MouseEvent<HTMLElement>,
    driver: Driver,
  ) => {
    event.stopPropagation()
    setAssignAnchor(event.currentTarget)
    setTargetDriver(driver)
  }

  const handleCloseAssignMenu = () => {
    setAssignAnchor(null)
    setTargetDriver(null)
  }

  const handleSelectTruck = (truckCode: string | null) => {
    if (targetDriver) {
      drivers.assignTruck(targetDriver.id, truckCode)
      if (detailDriver && detailDriver.id === targetDriver.id) {
        setDetailDriver({
          ...detailDriver,
          assignedTruck: truckCode?.trim() || null,
        })
      }
    }
    handleCloseAssignMenu()
  }

  const stats = [
    {
      label: 'Choferes totales',
      value: drivers.stats.total,
      icon: <PeopleIcon />,
    },
    {
      label: 'Activos',
      value: drivers.stats.activos,
      icon: <PeopleIcon />,
    },
    {
      label: 'Inactivos',
      value: drivers.stats.inactivos,
      icon: <PeopleIcon />,
    },
  ]

  return (
    <section className="admin-drivers" aria-labelledby="admin-drivers-title">
      <div className="admin-drivers-stats">
        {stats.map((stat) => (
          <article className="admin-drivers-stat" key={stat.label}>
            <span className="admin-drivers-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-drivers-stat-label">{stat.label}</span>
              <strong className="admin-drivers-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-drivers-panel">
        <div className="admin-drivers-toolbar">
          <TextField
            className="admin-drivers-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Nombre, DNI, teléfono o licencia"
            value={drivers.search}
            onChange={(event) => drivers.setSearch(event.target.value)}
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

          <FormControl
            size="small"
            color="success"
            className="admin-drivers-filter"
          >
            <InputLabel id="admin-drivers-status-filter">Estado</InputLabel>
            <Select
              labelId="admin-drivers-status-filter"
              id="admin-drivers-status-filter-select"
              label="Estado"
              value={drivers.statusFilter}
              onChange={(event) =>
                drivers.setStatusFilter(event.target.value as StatusFilter)
              }
            >
              <MenuItem value="TODOS">Todos los estados</MenuItem>
              <MenuItem value="ACTIVO">Activos</MenuItem>
              <MenuItem value="INACTIVO">Inactivos</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="success"
            className="admin-drivers-add"
            startIcon={<AddIcon />}
            onClick={drivers.openCreate}
          >
            Agregar chofer
          </Button>
        </div>

        <div className="admin-drivers-table-header">
          <div>
            <h3 id="admin-drivers-title">Listado de choferes</h3>
            <p>Gestión del personal de recolección y asignación de unidades.</p>
          </div>
          <span className="admin-drivers-count">
            {drivers.filteredDrivers.length} de {drivers.drivers.length}
          </span>
        </div>

        {drivers.loading ? (
          <div className="admin-drivers-loading" aria-label="Cargando choferes">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} variant="rounded" height={54} />
            ))}
          </div>
        ) : drivers.filteredDrivers.length === 0 ? (
          <div className="admin-drivers-empty">
            <LocalShippingIcon
              className="admin-drivers-empty-icon"
              aria-hidden="true"
            />
            <h4>
              {drivers.drivers.length === 0
                ? 'Todavía no hay choferes registrados'
                : 'No encontramos choferes'}
            </h4>
            <p>
              {drivers.drivers.length === 0
                ? 'Agregá el primer chofer para gestionar las asignaciones.'
                : 'Probá con otra búsqueda o cambiá el filtro de estado.'}
            </p>
            {drivers.drivers.length === 0 ? (
              <Button variant="contained" color="success" onClick={drivers.openCreate}>
                Agregar chofer
              </Button>
            ) : (
              <Button color="success" onClick={drivers.clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <TableContainer>
            <Table
              className="admin-drivers-table"
              aria-label="Choferes registrados"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Chofer</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Unidad asignada</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drivers.filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} hover>
                    <TableCell>
                      <div className="admin-drivers-identity">
                        <Avatar className="admin-drivers-avatar">
                          {driverInitials(driver)}
                        </Avatar>
                        <div>
                          <span className="admin-drivers-name">
                            {driverFullName(driver)}
                          </span>
                          <span className="admin-drivers-subtext">
                            DNI {driver.dni}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="admin-drivers-contact">
                        <span className="admin-drivers-contact-item">
                          <PhoneIcon fontSize="small" aria-hidden="true" />
                          {driver.phone}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {driver.assignedTruck ? (
                        <div className="admin-drivers-truck">
                          <DirectionsCarIcon fontSize="small" aria-hidden="true" />
                          <span>{driver.assignedTruck}</span>
                        </div>
                      ) : (
                        <Tooltip title={`Asignar unidad a ${driverFullName(driver)}`}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<AddIcon />}
                            className="admin-drivers-assign-btn"
                            onClick={(event) => handleOpenAssignMenu(event, driver)}
                          >
                            Asignar
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(driver.status)}
                        className={`admin-drivers-status ${statusChipClass(
                          driver.status,
                        )}`}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <div className="admin-drivers-actions">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            aria-label={`Ver detalle de ${driverFullName(
                              driver,
                            )}`}
                            onClick={() => setDetailDriver(driver)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Editar chofer">
                          <IconButton
                            size="small"
                            aria-label={`Editar a ${driverFullName(driver)}`}
                            onClick={() => drivers.startEdit(driver)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Eliminar chofer">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Eliminar a ${driverFullName(driver)}`}
                            onClick={() => drivers.requestDelete(driver)}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      <Dialog
        open={Boolean(detailDriver)}
        onClose={() => setDetailDriver(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-drivers-detail-title"
      >
        <DialogTitle id="admin-drivers-detail-title">
          Ficha del chofer
        </DialogTitle>
        <DialogContent dividers>
          {detailDriver && (
            <>
              <div className="admin-drivers-detail-header">
                <Avatar className="admin-drivers-avatar admin-drivers-detail-avatar">
                  {driverInitials(detailDriver)}
                </Avatar>
                <div>
                  <h3>{driverFullName(detailDriver)}</h3>
                  <p>DNI {detailDriver.dni}</p>
                  <Chip
                    size="small"
                    label={statusLabel(detailDriver.status)}
                    className={`admin-drivers-status ${statusChipClass(
                      detailDriver.status,
                    )}`}
                  />
                </div>
              </div>

              <div className="admin-drivers-detail-grid">
                <article className="admin-drivers-detail-card">
                  <h4>Contacto</h4>
                  <p>
                    <PhoneIcon fontSize="small" aria-hidden="true" />
                    {detailDriver.phone}
                  </p>
                </article>
                <article className="admin-drivers-detail-card">
                  <h4>Unidad asignada</h4>
                  {detailDriver.assignedTruck ? (
                    <div className="admin-drivers-detail-truck-row">
                      <p>
                        <LocalShippingIcon fontSize="small" aria-hidden="true" />
                        {detailDriver.assignedTruck}
                      </p>
                      <Button
                        size="small"
                        color="success"
                        onClick={(e) => handleOpenAssignMenu(e, detailDriver)}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          minWidth: 'auto',
                          p: '1px 8px',
                          ml: 'auto',
                        }}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="admin-drivers-detail-truck-row">
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<AddIcon />}
                        className="admin-drivers-assign-btn"
                        onClick={(e) => handleOpenAssignMenu(e, detailDriver)}
                      >
                        Asignar
                      </Button>
                    </div>
                  )}
                </article>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDetailDriver(null)}>
            Cerrar
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => {
              if (detailDriver) {
                setDetailDriver(null)
                drivers.startEdit(detailDriver)
              }
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isEditing}
        onClose={drivers.closeForm}
        fullWidth
        maxWidth="md"
        aria-labelledby="admin-drivers-form-title"
      >
        <DialogTitle id="admin-drivers-form-title">
          {drivers.editing ? 'Editar chofer' : 'Agregar chofer'}
        </DialogTitle>
        <DialogContent dividers>
          <form
            id="admin-drivers-form"
            className="admin-drivers-form"
            onSubmit={drivers.save}
            noValidate
          >
            {drivers.formError && (
              <div className="admin-drivers-form-full">
                <Alert severity="error">{drivers.formError}</Alert>
              </div>
            )}

            <TextField
              label="Nombre"
              required
              color="success"
              autoComplete="given-name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              disabled={drivers.saving}
              error={Boolean(drivers.fieldErrors.firstName)}
              helperText={drivers.fieldErrors.firstName?.[0]}
              value={drivers.form.firstName}
              onChange={(event) =>
                drivers.updateField('firstName', event.target.value)
              }
            />

            <TextField
              label="Apellido"
              required
              color="success"
              autoComplete="family-name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              disabled={drivers.saving}
              error={Boolean(drivers.fieldErrors.lastName)}
              helperText={drivers.fieldErrors.lastName?.[0]}
              value={drivers.form.lastName}
              onChange={(event) =>
                drivers.updateField('lastName', event.target.value)
              }
            />

            <TextField
              label="DNI"
              required
              color="success"
              slotProps={{ htmlInput: { maxLength: 10, inputMode: 'numeric' } }}
              disabled={drivers.saving}
              error={Boolean(drivers.fieldErrors.dni)}
              helperText={drivers.fieldErrors.dni?.[0]}
              value={drivers.form.dni}
              onChange={(event) =>
                drivers.updateField('dni', event.target.value)
              }
            />

            <TextField
              label="Teléfono"
              required
              color="success"
              slotProps={{ htmlInput: { maxLength: 20 } }}
              disabled={drivers.saving}
              error={Boolean(drivers.fieldErrors.phone)}
              helperText={drivers.fieldErrors.phone?.[0]}
              value={drivers.form.phone}
              onChange={(event) =>
                drivers.updateField('phone', event.target.value)
              }
            />

            <FormControl
              className="admin-drivers-form-full"
              color="success"
              disabled={drivers.saving}
              error={Boolean(drivers.fieldErrors.assignedTruck)}
            >
              <InputLabel id="admin-drivers-form-assigned-truck">
                Unidad asignada
              </InputLabel>
              <Select
                labelId="admin-drivers-form-assigned-truck"
                id="admin-drivers-form-assigned-truck-select"
                label="Unidad asignada"
                value={drivers.form.assignedTruck ?? ''}
                onChange={(event) =>
                  drivers.updateField('assignedTruck', event.target.value)
                }
              >
                <MenuItem value="">
                  <em>Sin unidad asignada</em>
                </MenuItem>
                {systemTrucks.map((truck) => (
                  <MenuItem key={truck.code} value={truck.code}>
                    {truck.label}
                  </MenuItem>
                ))}
                {Boolean(drivers.form.assignedTruck) &&
                  !systemTrucks.some((t) => t.code === drivers.form.assignedTruck) && (
                    <MenuItem value={drivers.form.assignedTruck}>
                      {drivers.form.assignedTruck}
                    </MenuItem>
                  )}
              </Select>
              <FormHelperText>
                {drivers.fieldErrors.assignedTruck?.[0] ||
                  'Seleccioná una unidad de la flota registrada en el sistema.'}
              </FormHelperText>
            </FormControl>
          </form>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={drivers.closeForm} disabled={drivers.saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-drivers-form"
            variant="contained"
            color="success"
            disabled={drivers.saving}
            startIcon={drivers.saving ? undefined : <EditIcon />}
          >
            {drivers.saving
              ? 'Guardando…'
              : drivers.editing
                ? 'Guardar cambios'
                : 'Agregar chofer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(drivers.pendingDelete)}
        onClose={drivers.cancelDelete}
        fullWidth
        maxWidth="xs"
        aria-labelledby="admin-drivers-delete-title"
      >
        <DialogTitle id="admin-drivers-delete-title">
          Eliminar chofer
        </DialogTitle>
        <DialogContent dividers>
          <p>
            ¿Seguro que querés eliminar a{' '}
            <strong>
              {drivers.pendingDelete ? driverFullName(drivers.pendingDelete) : ''}
            </strong>
            ? Esta acción no se puede deshacer.
          </p>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={drivers.cancelDelete}
            disabled={drivers.deleting}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={drivers.confirmDelete}
            disabled={drivers.deleting}
          >
            {drivers.deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(drivers.notice)}
        autoHideDuration={4000}
        onClose={drivers.dismissNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={drivers.dismissNotice}
        >
          {drivers.notice}
        </Alert>
      </Snackbar>

      <Menu
        anchorEl={assignAnchor}
        open={Boolean(assignAnchor)}
        onClose={handleCloseAssignMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
              minWidth: 260,
              maxWidth: 340,
            },
          },
        }}
      >
        <MenuItem
          disabled
          sx={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#64748b !important',
            opacity: '1 !important',
            py: 0.5,
          }}
        >
          {targetDriver
            ? `Asignar a ${driverFullName(targetDriver)}`
            : 'Asignar camión'}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />

        {systemTrucks.length === 0 ? (
          <MenuItem disabled sx={{ fontSize: '0.82rem', fontStyle: 'italic' }}>
            No hay camiones registrados
          </MenuItem>
        ) : (
          systemTrucks.map((truck) => {
            const isCurrent = targetDriver?.assignedTruck === truck.code
            return (
              <MenuItem
                key={truck.code}
                selected={isCurrent}
                onClick={() => handleSelectTruck(truck.code)}
                sx={{
                  fontSize: '0.82rem',
                  gap: 1,
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                <LocalShippingIcon
                  fontSize="small"
                  sx={{ color: isCurrent ? '#1e6000' : '#64748b' }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {truck.label}
                </span>
              </MenuItem>
            )
          })
        )}

        {targetDriver?.assignedTruck && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => handleSelectTruck(null)}
              sx={{ fontSize: '0.82rem', color: '#dc2626' }}
            >
              <DeleteOutlineOutlinedIcon
                fontSize="small"
                sx={{ mr: 1, color: '#dc2626' }}
              />
              Desvincular unidad (Sin asignar)
            </MenuItem>
          </>
        )}

        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            if (targetDriver) {
              drivers.startEdit(targetDriver)
            }
            handleCloseAssignMenu()
          }}
          sx={{ fontSize: '0.8rem', color: '#1e6000', fontWeight: 600 }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar chofer completo…
        </MenuItem>
      </Menu>
    </section>
  )
}

export default AdminChoferes
