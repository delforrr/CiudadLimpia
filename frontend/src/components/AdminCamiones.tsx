import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PersonIcon from '@mui/icons-material/Person'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useAdminCamiones } from '../hooks/useAdminCamiones'
import { fechasContrato, type CamionApi } from '../services/flotaService'
import { AsignarContratoDialog } from './AsignarContratoDialog'
import { formatoContrato } from '../utils/contratoConductor'
import './AdminCamiones.css'

const STATUS_LABELS = { ACTIVO: 'Operativo', INACTIVO: 'Fuera de servicio' }

export function AdminCamiones() {
  const admin = useAdminCamiones()
  const { camiones: trucks, filteredTrucks, form, setForm, formErrors } = admin
  const [detailId, setDetailId] = useState<string | null>(null)
  const [asignacionPendiente, setAsignacionPendiente] = useState<CamionApi | null>(null)
  const detailTruck = trucks.find(({ id }) => id === detailId)
  const asignacionesDetalle = detailId ? admin.asignaciones(detailId) : []
  const stats = [
    { label: 'Camiones totales', value: trucks.length, icon: <LocalShippingIcon /> },
    { label: 'Operativos', value: trucks.filter(({ estado }) => estado === 'ACTIVO').length, icon: <CheckCircleIcon /> },
    { label: 'Fuera de servicio', value: trucks.filter(({ estado }) => estado === 'INACTIVO').length, icon: <ReportProblemOutlinedIcon /> },
  ]
  const handleClearFilters = () => {
    admin.setSearch('')
    admin.setStatusFilter('TODOS')
  }

  return (
    <section className="admin-trucks" aria-labelledby="admin-trucks-title">
      {/* Tarjetas de estadísticas / resumen */}
      {!admin.cargando && !admin.error && <div className="admin-trucks-stats admin-module-stats">
        {stats.map((stat) => (
          <article className="admin-trucks-stat admin-module-stat" key={stat.label}>
            <span className="admin-trucks-stat-icon admin-module-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-trucks-stat-label admin-module-stat-label">{stat.label}</span>
              <strong className="admin-trucks-stat-value admin-module-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>}

      {/* Panel principal de Camiones */}
      <div className="admin-trucks-panel admin-module-panel">
        <div className="admin-trucks-toolbar admin-module-toolbar">
          <TextField
            className="admin-trucks-search admin-module-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Patente, marca, modelo o chofer"
            value={admin.search}
            onChange={(e) => admin.setSearch(e.target.value)}
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
            className="admin-trucks-filter admin-module-filter"
          >
            <InputLabel id="admin-trucks-status-filter">Estado</InputLabel>
            <Select
              labelId="admin-trucks-status-filter"
              id="admin-trucks-status-filter-select"
              label="Estado"
              value={admin.statusFilter}
              onChange={(e) =>
                admin.setStatusFilter(e.target.value as typeof admin.statusFilter)
              }
            >
              <MenuItem value="TODOS">Todos los estados</MenuItem>
              <MenuItem value="ACTIVO">Operativos</MenuItem>
              <MenuItem value="INACTIVO">Fuera de servicio</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            className="admin-trucks-add"
            onClick={() => admin.abrirFormulario()}
            disabled={admin.cargando || Boolean(admin.error)}
          >
            Agregar camión
          </Button>
        </div>

        <div className="admin-trucks-table-header">
          <div>
            <h3 id="admin-trucks-title">Flota de camiones</h3>
            <p>Unidades registradas para la recolección municipal de residuos.</p>
          </div>
          {!admin.cargando && !admin.error && <span className="admin-trucks-count">
            {filteredTrucks.length} de {trucks.length}
          </span>}
        </div>

        {/* Listado de camiones */}
        {admin.cargando ? (
          <p role="status">Cargando camiones…</p>
        ) : admin.error ? (
          <Alert severity="error" action={<Button color="inherit" onClick={admin.recargar}>Reintentar</Button>}>
            {admin.error}
          </Alert>
        ) : filteredTrucks.length === 0 ? (
          <div className="admin-trucks-empty">
            <LocalShippingIcon className="admin-trucks-empty-icon" />
            <h4>No se encontraron camiones</h4>
            <p>
              {trucks.length === 0
                ? 'Agregá el primer camión para gestionar la flota municipal.'
                : 'Probá con otra búsqueda o cambiá el filtro de estado.'}
            </p>
            {trucks.length === 0 ? (
              <Button
                variant="contained"
                color="success"
                onClick={() => admin.abrirFormulario()}
              >
                Agregar camión
              </Button>
            ) : (
              <Button color="success" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <TableContainer className="admin-module-table-scroll">
            <Table
              className="admin-trucks-table admin-module-table"
              aria-label="Tabla de camiones"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Patente</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell>Modelo</TableCell>
                  <TableCell>Año</TableCell>
                  <TableCell>Conductor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTrucks.map((truck) => (
                  <TableRow key={truck.id} hover>
                    <TableCell>
                      <div className="admin-trucks-identity">
                        <span className="admin-trucks-marker" aria-hidden="true">
                          <LocalShippingIcon fontSize="small" />
                        </span>
                        <div>
                          <span className="admin-trucks-name">{truck.patente}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="admin-trucks-cell-text">{truck.marca}</span>
                    </TableCell>
                    <TableCell>
                      <span className="admin-trucks-cell-text">{truck.modelo}</span>
                    </TableCell>
                    <TableCell>
                      <span className="admin-trucks-cell-subtext">{truck.anio}</span>
                    </TableCell>
                    <TableCell>
                      <div className="admin-trucks-drivers-cell">
                        {admin.asignaciones(truck.id).map(({ nombre, contrato }) => (
                          <span className="admin-trucks-driver" key={contrato.fechaInicio}>
                            <PersonIcon fontSize="small" aria-hidden="true" />
                            {nombre}{Date.parse(contrato.fechaInicio) > admin.ahora ? " (programado)" : ""}
                          </span>
                        ))}
                        {admin.asignaciones(truck.id).length === 0 && (truck.estado === "INACTIVO" ? "—" : (
                          <Tooltip title={`Asignar conductor a ${truck.patente}`}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<AddIcon />}
                              className="admin-trucks-assign-btn"
                              aria-label={`Asignar conductor a ${truck.patente}`}
                              onClick={() => setAsignacionPendiente(truck)}
                            >
                              Asignar
                            </Button>
                          </Tooltip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABELS[truck.estado]}
                        className={`admin-trucks-status ${truck.estado === 'ACTIVO' ? 'is-active' : 'is-inactive'}`}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div className="admin-trucks-actions">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            aria-label={`Ver detalle de ${truck.patente}`}
                            onClick={() => {
                              admin.setContratoError('')
                              setDetailId(truck.id)
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar camión">
                          <IconButton
                            size="small"
                            aria-label={`Editar ${truck.patente}`}
                            onClick={() => admin.abrirFormulario(truck)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Dar de baja camión">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Dar de baja ${truck.patente}`}
                            onClick={() => admin.abrirBaja(truck)}
                            disabled={truck.estado === "INACTIVO"}
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

      {asignacionPendiente && <AsignarContratoDialog
        titulo={`Asignar conductor a ${asignacionPendiente.patente}`}
        campo="Conductor"
        opciones={admin.conductores.filter(({ activo }) => activo)
          .map(({ id, nombre, apellido }) => ({ id, label: `${nombre} ${apellido}` }))}
        onCerrar={() => setAsignacionPendiente(null)}
        onConfirmar={async (id, contrato) => {
          await admin.asignar(asignacionPendiente.id, id, contrato)
          admin.setNotice('Se registró el contrato.')
        }}
      />}

      {/* Ficha del camión */}
      <Dialog
        className="admin-module-dialog"
        open={Boolean(detailTruck)}
        onClose={() => setDetailId(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="admin-trucks-detail-title"
      >
        <DialogTitle id="admin-trucks-detail-title">
          Ficha técnica de la unidad
        </DialogTitle>
        <DialogContent dividers>
          {detailTruck && (
            <>
              <div className="admin-trucks-detail-header">
                <div className="admin-trucks-detail-avatar">
                  <LocalShippingIcon />
                </div>
                <div>
                  <h3>{detailTruck.patente}</h3>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[detailTruck.estado]}
                    className={`admin-trucks-status ${detailTruck.estado === 'ACTIVO' ? 'is-active' : 'is-inactive'}`}
                  />
                </div>
              </div>

              {/* Datos del camión: Marca/Modelo, Año y conductores */}
              <div className="admin-trucks-detail-grid">
                <article className="admin-trucks-detail-card">
                  <h4>Marca y Modelo</h4>
                  <p>
                    <DirectionsCarIcon fontSize="small" />
                    {detailTruck.marca} {detailTruck.modelo}
                  </p>
                </article>

                <article className="admin-trucks-detail-card">
                  <h4>Año de fabricación</h4>
                  <p>
                    <CalendarMonthIcon fontSize="small" />
                    {detailTruck.anio}
                  </p>
                </article>

                <article className="admin-trucks-detail-card">
                  <h4>Conductores ({asignacionesDetalle.length})</h4>
                  <p>
                    <PersonIcon fontSize="small" />
                    {asignacionesDetalle.length > 0
                      ? 'Asignados a la unidad'
                      : 'Sin conductores asignados'}
                  </p>
                </article>
              </div>

              <div className="admin-trucks-conductores-section">
                <div className="admin-trucks-conductores-header">
                  <h4>Conductores y contratos</h4>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<AddIcon />}
                    className="admin-trucks-assign-btn"
                    onClick={() => setAsignacionPendiente(detailTruck)}
                    disabled={detailTruck.estado === "INACTIVO"}
                  >
                    Asignar
                  </Button>
                </div>
                {admin.contratoError && <Alert severity="error">{admin.contratoError}</Alert>}
                {asignacionesDetalle.map(({ nombre, contrato }) => (
                  <div className="admin-trucks-conductor-item" key={nombre}>
                    <div>
                      <strong>{nombre}</strong>
                      <span>{formatoContrato(fechasContrato(contrato))}</span>
                    </div>
                    {Date.parse(contrato.fechaInicio) < admin.ahora && <Tooltip title={`Finalizar el contrato de ${nombre}`}>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Finalizar el contrato de ${nombre}`}
                        onClick={() => void admin.finalizarContrato(contrato)}
                        disabled={admin.finalizando}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>}
                  </div>
                ))}
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
              if (detailTruck) {
                const tr = detailTruck
                setDetailId(null)
                admin.abrirFormulario(tr)
              }
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Agregar / Editar Camión */}
      <Dialog
        className="admin-module-dialog"
        open={admin.isFormOpen}
        onClose={admin.handleCloseForm}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-trucks-form-title"
      >
        <DialogTitle id="admin-trucks-form-title">
          {admin.editingTruck ? `Editar camión` : 'Agregar camión'}
        </DialogTitle>
        <DialogContent dividers>
          <form
            id="admin-trucks-form"
            className="admin-trucks-form"
            onSubmit={admin.handleSave}
            noValidate
          >
            {admin.formError && <Alert className="admin-trucks-form-full" severity="error">{admin.formError}</Alert>}

            <TextField
              label="Patente"
              disabled={admin.saving}
              placeholder="Ej: AE 123 CD"
              color="success"
              fullWidth
              value={form.patente}
              onChange={(e) => setForm({ ...form, patente: e.target.value })}
              error={Boolean(formErrors.patente)}
              helperText={formErrors.patente}
              required
            />

            <TextField
              label="Año"
              disabled={admin.saving}
              type="number"
              placeholder="Ej: 2022"
              color="success"
              fullWidth
              value={form.anio}
              onChange={(e) => setForm({ ...form, anio: e.target.value })}
              error={Boolean(formErrors.anio)}
              helperText={formErrors.anio}
              required
            />

            <TextField
              label="Marca"
              disabled={admin.saving}
              placeholder="Ej: Iveco"
              color="success"
              fullWidth
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              error={Boolean(formErrors.marca)}
              helperText={formErrors.marca}
              required
            />

            <TextField
              label="Modelo"
              disabled={admin.saving}
              placeholder="Ej: Tector 170E28"
              color="success"
              fullWidth
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              error={Boolean(formErrors.modelo)}
              helperText={formErrors.modelo}
              required
            />

            {/* El estado solo aparece cuando se edita un camión existente */}
            {admin.editingTruck && (
              <FormControl color="success" fullWidth disabled={admin.saving}>
                <InputLabel id="truck-status-select-label">Estado</InputLabel>
                <Select
                  labelId="truck-status-select-label"
                  id="truck-status-select"
                  label="Estado"
                  value={form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value as CamionApi["estado"] })
                  }
                >
                  <MenuItem value="ACTIVO">Operativo</MenuItem>
                  <MenuItem value="INACTIVO">Fuera de servicio</MenuItem>
                </Select>
                <FormHelperText>
                  Definí si la unidad se encuentra disponible.
                </FormHelperText>
              </FormControl>
            )}

          </form>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={admin.handleCloseForm} disabled={admin.saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-trucks-form"
            variant="contained"
            color="success"
            startIcon={<EditIcon />}
            disabled={admin.saving}
          >
            {admin.editingTruck ? 'Guardar cambios' : 'Agregar camión'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Confirmación de Eliminación */}
      <Dialog
        className="admin-module-dialog"
        open={Boolean(admin.pendingDeleteTruck)}
        onClose={() => admin.abrirBaja(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-truck-dialog-title"
      >
        <DialogTitle id="delete-truck-dialog-title">Dar de baja camión</DialogTitle>
        <DialogContent dividers>
          {admin.deleteError && <Alert severity="error">{admin.deleteError}</Alert>}
          {admin.pendingDeleteTruck && (
            <p className="admin-trucks-delete-confirm-text">
              ¿Querés dar de baja el camión{' '}
              <strong>{admin.pendingDeleteTruck.patente}</strong>? La unidad quedará fuera de servicio.
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => admin.abrirBaja(null)} disabled={admin.deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={admin.handleDelete} disabled={admin.deleting}>
            {admin.deleting ? "Guardando…" : "Dar de baja"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar
        open={Boolean(admin.notice)}
        autoHideDuration={4000}
        onClose={() => admin.setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => admin.setNotice('')}
        >
          {admin.notice}
        </Alert>
      </Snackbar>

    </section>
  )
}

export default AdminCamiones
