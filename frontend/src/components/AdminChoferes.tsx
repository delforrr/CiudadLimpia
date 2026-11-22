import { useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useDrivers, type StatusFilter } from '../hooks/useDrivers'
import { fechasContrato } from '../services/flotaService'
import { driverFullName, driverInitials, type Driver } from '../utils/driverFormat'
import { AsignarContratoDialog } from './AsignarContratoDialog'
import { formatoContrato } from '../utils/contratoConductor'
import './AdminChoferes.css'

export function AdminChoferes() {
  const drivers = useDrivers()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [asignacionPendiente, setAsignacionPendiente] = useState<Driver | null>(null)
  const detailDriver = drivers.drivers.find(({ id }) => id === detailId)
  const isEditing = Boolean(drivers.editing) || drivers.isCreating

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
      {asignacionPendiente && <AsignarContratoDialog
        titulo={`Asignar camión a ${driverFullName(asignacionPendiente)}`}
        campo="Camión"
        opciones={drivers.camiones.filter(({ estado }) => estado === "ACTIVO")
          .map(({ id, patente, marca, modelo }) => ({ id, label: `${patente} · ${marca} ${modelo}` }))}
        onCerrar={() => setAsignacionPendiente(null)}
        onConfirmar={async (id, contrato) => {
          await drivers.asignar(id, asignacionPendiente.id, contrato)
          drivers.setNotice('Se registró el contrato.')
        }}
      />}
      {!drivers.cargando && !drivers.error && <div className="admin-drivers-stats admin-module-stats">
        {stats.map((stat) => (
          <article className="admin-drivers-stat admin-module-stat" key={stat.label}>
            <span className="admin-drivers-stat-icon admin-module-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-drivers-stat-label admin-module-stat-label">{stat.label}</span>
              <strong className="admin-drivers-stat-value admin-module-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>}

      <div className="admin-drivers-panel admin-module-panel">
        <div className="admin-drivers-toolbar admin-module-toolbar">
          <TextField
            className="admin-drivers-search admin-module-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Nombre, apellido o patente"
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
            className="admin-drivers-filter admin-module-filter"
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
            disabled={drivers.cargando || Boolean(drivers.error)}
          >
            Agregar chofer
          </Button>
        </div>

        <div className="admin-drivers-table-header admin-module-header">
          <div>
            <h3 id="admin-drivers-title">Listado de choferes</h3>
            <p>Gestión del personal de recolección y asignación de unidades.</p>
          </div>
          {!drivers.cargando && !drivers.error && <span className="admin-drivers-count admin-module-count">
            {drivers.filteredDrivers.length} de {drivers.drivers.length}
          </span>}
        </div>

        {drivers.cargando ? (
          <div className="admin-drivers-loading" aria-label="Cargando choferes">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} variant="rounded" height={54} />
            ))}
          </div>
        ) : drivers.error ? (
          <Alert severity="error" action={<Button color="inherit" onClick={drivers.recargar}>Reintentar</Button>}>
            {drivers.error}
          </Alert>
        ) : drivers.filteredDrivers.length === 0 ? (
          <div className="admin-drivers-empty admin-module-empty">
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
          <TableContainer className="admin-module-table-scroll" role="region" tabIndex={0} aria-labelledby="admin-drivers-title">
            <Table
              className="admin-drivers-table admin-module-table"
              aria-label="Choferes registrados"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Chofer</TableCell>
                  <TableCell>Unidad asignada</TableCell>
                  <TableCell>Contrato</TableCell>
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
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {driver.assignedTruck ? (
                        <div className="admin-drivers-truck">
                          <DirectionsCarIcon fontSize="small" aria-hidden="true" />
                          <span>{driver.assignedTruck}{driver.contrato && Date.parse(driver.contrato.fechaInicio) > drivers.ahora ? " (programado)" : ""}</span>
                        </div>
                      ) : !driver.activo ? "—" : (
                        <Tooltip title={`Asignar unidad a ${driverFullName(driver)}`}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<AddIcon />}
                            className="admin-drivers-assign-btn"
                            onClick={() => setAsignacionPendiente(driver)}
                          >
                            Asignar
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell>{driver.contrato ? formatoContrato(fechasContrato(driver.contrato)) : "—"}</TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={driver.activo ? "Activo" : "Inactivo"}
                        className={`admin-drivers-status ${driver.activo ? "is-active" : "is-inactive"}`}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <div className="admin-drivers-actions admin-module-actions">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            aria-label={`Ver detalle de ${driverFullName(
                              driver,
                            )}`}
                            onClick={() => {
                              drivers.setContratoError("")
                              setDetailId(driver.id)
                            }}
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

                        <Tooltip title="Dar de baja al chofer">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Dar de baja a ${driverFullName(driver)}`}
                            onClick={() => drivers.requestDelete(driver)}
                            disabled={!driver.activo}
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
        className="admin-module-dialog"
        open={Boolean(detailDriver)}
        onClose={() => setDetailId(null)}
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
                  <Chip
                    size="small"
                    label={detailDriver.activo ? "Activo" : "Inactivo"}
                    className={`admin-drivers-status ${detailDriver.activo ? "is-active" : "is-inactive"}`}
                  />
                </div>
              </div>

              {drivers.contratoError && <Alert severity="error">{drivers.contratoError}</Alert>}
              {detailDriver.contrato && <p>{formatoContrato(fechasContrato(detailDriver.contrato))}</p>}
              <div className="admin-drivers-detail-grid">
                <article className="admin-drivers-detail-card">
                  <h4>Unidad asignada</h4>
                  {detailDriver.assignedTruck && <p>{detailDriver.assignedTruck}</p>}
                  {detailDriver.activo && <Button size="small" color="success"
                    onClick={() => setAsignacionPendiente(detailDriver)}>Asignar</Button>}
                  {detailDriver.contrato && Date.parse(detailDriver.contrato.fechaInicio) < drivers.ahora && (
                    <Button size="small" color="error" disabled={drivers.finalizando}
                      onClick={() => { if (detailDriver.contrato) void drivers.finalizarContrato(detailDriver.contrato) }}>
                      Finalizar contrato
                    </Button>
                  )}
                  {!detailDriver.assignedTruck && !detailDriver.activo && <p>Sin unidad asignada.</p>}
                </article>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDetailId(null)}>
            Cerrar
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => {
              if (detailDriver) {
                setDetailId(null)
                drivers.startEdit(detailDriver)
              }
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        className="admin-module-dialog"
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
              error={Boolean(drivers.fieldErrors.nombre)}
              helperText={drivers.fieldErrors.nombre?.[0]}
              value={drivers.form.nombre}
              onChange={(event) =>
                drivers.updateField('nombre', event.target.value)
              }
            />

            <TextField
              label="Apellido"
              required
              color="success"
              autoComplete="family-name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              disabled={drivers.saving}
              error={Boolean(drivers.fieldErrors.apellido)}
              helperText={drivers.fieldErrors.apellido?.[0]}
              value={drivers.form.apellido}
              onChange={(event) =>
                drivers.updateField('apellido', event.target.value)
              }
            />

            <FormControl color="success" disabled={drivers.saving} fullWidth>
              <InputLabel id="admin-drivers-form-status">Estado</InputLabel>
              <Select labelId="admin-drivers-form-status" label="Estado"
                value={drivers.form.activo ? "ACTIVO" : "INACTIVO"}
                onChange={(event) => drivers.updateField("activo", event.target.value === "ACTIVO")}>
                <MenuItem value="ACTIVO">Activo</MenuItem>
                <MenuItem value="INACTIVO">Inactivo</MenuItem>
              </Select>
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
        className="admin-module-dialog"
        open={Boolean(drivers.pendingDelete)}
        onClose={drivers.cancelDelete}
        fullWidth
        maxWidth="xs"
        aria-labelledby="admin-drivers-delete-title"
      >
        <DialogTitle id="admin-drivers-delete-title">
          Dar de baja al chofer
        </DialogTitle>
        <DialogContent dividers>
          {drivers.deleteError && <Alert severity="error">{drivers.deleteError}</Alert>}
          <p>
            ¿Querés dar de baja a{' '}
            <strong>
              {drivers.pendingDelete ? driverFullName(drivers.pendingDelete) : ''}
            </strong>
            ? El chofer quedará inactivo.
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
            {drivers.deleting ? 'Guardando…' : 'Dar de baja'}
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

    </section>
  )
}

export default AdminChoferes
