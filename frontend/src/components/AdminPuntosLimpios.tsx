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
import EditIcon from '@mui/icons-material/Edit'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import LocalDrinkIcon from '@mui/icons-material/LocalDrink'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import RecyclingIcon from '@mui/icons-material/Recycling'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  usePuntosLimpios,
  type EstadoFilter,
  type TipoFilter,
} from '../hooks/usePuntosLimpios'
import {
  estadoPuntoChipClass,
  estadoPuntoLabel,
  findTipoPunto,
  tipoToneClass,
  type PuntoLimpioAdmin,
} from '../utils/puntosLimpiosFormat'
import './AdminPuntosLimpios.css'
import { puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'

const TIPO_ICONS = [
  <RecyclingIcon key="punto-limpio" />,
  <LocalDrinkIcon key="botellero" />,
  <Inventory2Icon key="latero" />,
  <LocationOnIcon key="otro" />,
]

export function AdminPuntosLimpios() {
  const puntos = usePuntosLimpios()
  const [detailPunto, setDetailPunto] = useState<PuntoLimpioAdmin | null>(null)
  const isEditing = Boolean(puntos.editing) || puntos.isCreating

  const detailTipoIndex = detailPunto
    ? puntos.tipos.findIndex((tipo) => tipo.id === detailPunto.tipoId)
    : -1
  const detailTipo =
    detailTipoIndex >= 0 ? puntos.tipos[detailTipoIndex] : null
  const formTipo = findTipoPunto(puntos.tipos, puntos.form.tipoId)

  const stats = [
    {
      label: 'Puntos totales',
      value: puntos.stats.total,
      icon: <LocationOnIcon />,
    },
    ...puntos.tipos.map((tipo, index) => ({
      label: tipo.nombre,
      value: puntos.stats.porTipo[tipo.id] ?? 0,
      icon: tipo.logo ? (
        <img
          src={puntoLimpioIconSrc(tipo.logo, tipo.colorFondo)}
          alt={`Logo ${tipo.nombre}`}
          className="admin-points-stat-logo"
        />
      ) : (
        TIPO_ICONS[index % TIPO_ICONS.length]
      ),
    })),
  ]

  return (
    <section className="admin-points" aria-labelledby="admin-points-title">
      <div className="admin-points-stats">
        {stats.map((stat) => (
          <article className="admin-points-stat" key={stat.label}>
            <span className="admin-points-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-points-stat-label">{stat.label}</span>
              <strong className="admin-points-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-points-panel">
        <div className="admin-points-toolbar">
          <TextField
            className="admin-points-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Nombre, dirección o material"
            value={puntos.search}
            onChange={(event) => puntos.setSearch(event.target.value)}
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
            className="admin-points-filter"
          >
            <InputLabel id="admin-points-type-filter">Tipo</InputLabel>
            <Select
              labelId="admin-points-type-filter"
              id="admin-points-type-filter-select"
              label="Tipo"
              value={puntos.tipoFilter}
              onChange={(event) =>
                puntos.setTipoFilter(event.target.value as TipoFilter)
              }
            >
              <MenuItem value="TODOS">Todos los tipos</MenuItem>
              {puntos.tipos.map((tipo) => (
                <MenuItem key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size="small"
            color="success"
            className="admin-points-filter"
          >
            <InputLabel id="admin-points-status-filter">Estado</InputLabel>
            <Select
              labelId="admin-points-status-filter"
              id="admin-points-status-filter-select"
              label="Estado"
              value={puntos.estadoFilter}
              onChange={(event) =>
                puntos.setEstadoFilter(event.target.value as EstadoFilter)
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
            className="admin-points-add"
            startIcon={<AddIcon />}
            onClick={puntos.openCreate}
          >
            Agregar punto limpio
          </Button>
        </div>

        <div className="admin-points-table-header">
          <div>
            <h3 id="admin-points-title">Puntos limpios registrados</h3>
            <p>Consultá, agregá y editá las estaciones de reciclaje.</p>
          </div>
          <span className="admin-points-count">
            {puntos.filteredPuntos.length} de {puntos.puntos.length}
          </span>
        </div>

        {puntos.loading ? (
          <div className="admin-points-loading" aria-label="Cargando puntos limpios">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} variant="rounded" height={54} />
            ))}
          </div>
        ) : puntos.filteredPuntos.length === 0 ? (
          <div className="admin-points-empty">
            <LocationOnIcon
              className="admin-points-empty-icon"
              aria-hidden="true"
            />
            <h4>
              {puntos.puntos.length === 0
                ? 'Todavía no hay puntos limpios registrados'
                : 'No encontramos puntos limpios'}
            </h4>
            <p>
              {puntos.puntos.length === 0
                ? 'Agregá el primer punto para gestionar las estaciones de reciclaje.'
                : 'Probá con otra búsqueda o cambiá los filtros.'}
            </p>
            {puntos.puntos.length === 0 ? (
              <Button variant="contained" color="success" onClick={puntos.openCreate}>
                Agregar punto limpio
              </Button>
            ) : (
              <Button color="success" onClick={puntos.clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <TableContainer>
            <Table
              className="admin-points-table"
              aria-label="Puntos limpios registrados"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Punto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Materiales</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {puntos.filteredPuntos.map((punto) => {
                  const tipoIndex = puntos.tipos.findIndex(
                    (tipo) => tipo.id === punto.tipoId,
                  )
                  const tipo =
                    tipoIndex >= 0 ? puntos.tipos[tipoIndex] : undefined
                  const tone = tipoToneClass(tipoIndex)
                  const materiales = tipo?.materiales ?? []

                  return (
                    <TableRow key={punto.id} hover>
                      <TableCell>
                        <div className="admin-points-identity">
                          <span
                            className={`admin-points-marker ${tone}`}
                            aria-hidden="true"
                          >
                            {tipo?.logo ? (
                              <img
                                src={puntoLimpioIconSrc(tipo.logo, tipo.colorFondo)}
                                alt={`Logo de ${tipo.nombre}`}
                                className="admin-points-marker-img"
                              />
                            ) : (
                              <LocationOnIcon fontSize="small" />
                            )}
                          </span>
                          <div>
                            <span className="admin-points-name">
                              {punto.nombre}
                            </span>
                            <span className="admin-points-subtext">
                              {punto.direccion}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={tipo?.nombre ?? 'Sin tipo'}
                          className="admin-points-type"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="admin-points-materials">
                          {materiales.slice(0, 2).map((material) => (
                            <Chip
                              key={material}
                              size="small"
                              label={material}
                              className="admin-points-material"
                            />
                          ))}
                          {materiales.length > 2 && (
                            <span className="admin-points-muted">
                              +{materiales.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={estadoPuntoLabel(punto.estado)}
                          className={`admin-points-status ${estadoPuntoChipClass(
                            punto.estado,
                          )}`}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <div className="admin-points-actions">
                          <Tooltip title="Ver detalle">
                            <IconButton
                              size="small"
                              aria-label={`Ver detalle de ${punto.nombre}`}
                              onClick={() => setDetailPunto(punto)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar punto limpio">
                            <IconButton
                              size="small"
                              aria-label={`Editar ${punto.nombre}`}
                              onClick={() => puntos.startEdit(punto)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Eliminar punto limpio">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Eliminar ${punto.nombre}`}
                              onClick={() => puntos.requestDelete(punto)}
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
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
        open={Boolean(detailPunto)}
        onClose={() => setDetailPunto(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-points-detail-title"
      >
        <DialogTitle id="admin-points-detail-title">
          Ficha del punto limpio
        </DialogTitle>
        <DialogContent dividers>
          {detailPunto && (
            <>
              <div className="admin-points-detail-header">
                <span
                  className={`admin-points-detail-marker ${tipoToneClass(
                    detailTipoIndex,
                  )}`}
                  aria-hidden="true"
                >
                  {detailTipo?.logo ? (
                    <img
                      src={puntoLimpioIconSrc(detailTipo.logo, detailTipo.colorFondo)}
                      alt={detailTipo.nombre}
                      className="admin-points-detail-logo-img"
                    />
                  ) : (
                    <LocationOnIcon />
                  )}
                </span>
                <div>
                  <h3>{detailPunto.nombre}</h3>
                  <p>{detailPunto.direccion}</p>
                  <div className="admin-points-detail-chips">
                    <Chip
                      size="small"
                      label={detailTipo?.nombre ?? 'Sin tipo'}
                      className="admin-points-type"
                    />
                    <Chip
                      size="small"
                      label={estadoPuntoLabel(detailPunto.estado)}
                      className={`admin-points-status ${estadoPuntoChipClass(
                        detailPunto.estado,
                      )}`}
                    />
                  </div>
                </div>
              </div>

              <h4 className="admin-points-detail-subtitle">
                Materiales que recibe
              </h4>
              <div className="admin-points-materials">
                {(detailTipo?.materiales ?? []).map((material) => (
                  <Chip
                    key={material}
                    size="small"
                    label={material}
                    className="admin-points-material"
                  />
                ))}
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDetailPunto(null)}>
            Cerrar
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => {
              if (detailPunto) {
                setDetailPunto(null)
                puntos.startEdit(detailPunto)
              }
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isEditing}
        onClose={puntos.closeForm}
        fullWidth
        maxWidth="md"
        aria-labelledby="admin-points-form-title"
      >
        <DialogTitle id="admin-points-form-title">
          {puntos.editing ? 'Editar punto limpio' : 'Agregar punto limpio'}
        </DialogTitle>
        <DialogContent dividers>
          <form
            id="admin-points-form"
            className="admin-points-form"
            onSubmit={puntos.save}
            noValidate
          >
            {puntos.formError && (
              <div className="admin-points-form-full">
                <Alert severity="error">{puntos.formError}</Alert>
              </div>
            )}

            <TextField
              className="admin-points-form-full"
              label="Nombre"
              required
              color="success"
              placeholder="Punto Limpio Barrio Esperanza"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              disabled={puntos.saving}
              error={Boolean(puntos.fieldErrors.nombre)}
              helperText={puntos.fieldErrors.nombre?.[0]}
              value={puntos.form.nombre}
              onChange={(event) =>
                puntos.updateField('nombre', event.target.value)
              }
            />

            <FormControl
              className={puntos.editing ? undefined : 'admin-points-form-full'}
              color="success"
              disabled={puntos.saving}
              error={Boolean(puntos.fieldErrors.tipoId)}
            >
              <InputLabel id="admin-points-form-type">Tipo</InputLabel>
              <Select
                labelId="admin-points-form-type"
                id="admin-points-form-type-select"
                label="Tipo"
                value={puntos.form.tipoId}
                onChange={(event) =>
                  puntos.updateField('tipoId', event.target.value)
                }
              >
                {puntos.tipos.map((tipo) => (
                  <MenuItem key={tipo.id} value={tipo.id}>
                    <div className="admin-points-type-cell">
                      {tipo.logo && (
                        <img
                          src={puntoLimpioIconSrc(tipo.logo, tipo.colorFondo)}
                          alt=""
                          aria-hidden="true"
                          className="admin-points-type-logo-thumb"
                        />
                      )}
                      <span>{tipo.nombre}</span>
                    </div>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {puntos.fieldErrors.tipoId?.[0] ||
                  'Definí la categoría del punto.'}
              </FormHelperText>
            </FormControl>

            {puntos.editing && (
              <FormControl color="success" disabled={puntos.saving}>
                <InputLabel id="admin-points-form-status">Estado</InputLabel>
                <Select
                  labelId="admin-points-form-status"
                  id="admin-points-form-status-select"
                  label="Estado"
                  value={puntos.form.estado}
                  onChange={(event) =>
                    puntos.updateField(
                      'estado',
                      event.target.value as PuntoLimpioAdmin['estado'],
                    )
                  }
                >
                  <MenuItem value="ACTIVO">Activo</MenuItem>
                  <MenuItem value="INACTIVO">Inactivo</MenuItem>
                </Select>
                <FormHelperText>
                  Definí si el punto se encuentra disponible.
                </FormHelperText>
              </FormControl>
            )}

            {formTipo && (
              <div className="admin-points-form-full admin-points-form-materials">
                <span className="admin-points-form-materials-label">
                  Materiales del tipo
                </span>
                <div className="admin-points-materials">
                  {formTipo.materiales.map((material) => (
                    <Chip
                      key={material}
                      size="small"
                      label={material}
                      className="admin-points-material"
                    />
                  ))}
                </div>
                <small>
                  Se asignan automáticamente según el tipo. Podés administrarlos
                  desde “Tipos de Puntos Limpios”.
                </small>
              </div>
            )}

            <TextField
              className="admin-points-form-full"
              label="Dirección"
              required
              color="success"
              placeholder="Pasteur n.º 1200"
              slotProps={{ htmlInput: { maxLength: 200 } }}
              disabled={puntos.saving}
              error={Boolean(puntos.fieldErrors.direccion)}
              helperText={puntos.fieldErrors.direccion?.[0]}
              value={puntos.form.direccion}
              onChange={(event) =>
                puntos.updateField('direccion', event.target.value)
              }
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={puntos.closeForm}
            disabled={puntos.saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-points-form"
            variant="contained"
            color="success"
            disabled={puntos.saving || puntos.tipos.length === 0}
            startIcon={puntos.saving ? undefined : <EditIcon />}
          >
            {puntos.saving
              ? 'Guardando…'
              : puntos.editing
                ? 'Guardar cambios'
                : 'Agregar punto limpio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(puntos.pendingDelete)}
        onClose={puntos.cancelDelete}
        fullWidth
        maxWidth="xs"
        aria-labelledby="admin-points-delete-title"
      >
        <DialogTitle id="admin-points-delete-title">
          Eliminar punto limpio
        </DialogTitle>
        <DialogContent dividers>
          <p>
            ¿Seguro que querés eliminar{' '}
            <strong>{puntos.pendingDelete?.nombre ?? ''}</strong>? Esta acción
            no se puede deshacer.
          </p>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={puntos.cancelDelete}
            disabled={puntos.deleting}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={puntos.confirmDelete}
            disabled={puntos.deleting}
          >
            {puntos.deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(puntos.notice)}
        autoHideDuration={4000}
        onClose={puntos.dismissNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={puntos.dismissNotice}
        >
          {puntos.notice}
        </Alert>
      </Snackbar>
    </section>
  )
}

export default AdminPuntosLimpios
