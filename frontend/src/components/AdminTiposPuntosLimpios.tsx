import { useState, type CSSProperties } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CategoryIcon from '@mui/icons-material/Category'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditIcon from '@mui/icons-material/Edit'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useTiposPuntosLimpios } from '../hooks/useTiposPuntosLimpios'
import {
  tipoToneClass,
  type TipoPuntoLimpio,
} from '../utils/puntosLimpiosFormat'
import { APP_LOGOS_PUNTOS_LIMPIOS, PUNTOS_LIMPIOS_COLORS, puntoLimpioIconSrc } from '../utils/puntosLimpiosLogos'
import './AdminTiposPuntosLimpios.css'

export function AdminTiposPuntosLimpios() {
  const tipos = useTiposPuntosLimpios()
  const [detailTipo, setDetailTipo] = useState<TipoPuntoLimpio | null>(null)
  const isEditing = Boolean(tipos.editing) || tipos.isCreating
  const colors = PUNTOS_LIMPIOS_COLORS.some((color) => color.value === tipos.form.colorFondo)
    ? PUNTOS_LIMPIOS_COLORS
    : [...PUNTOS_LIMPIOS_COLORS, { label: 'Color actual', value: tipos.form.colorFondo }]

  const detailIndex = detailTipo
    ? tipos.tipos.findIndex((tipo) => tipo.id === detailTipo.id)
    : -1

  const stats = [
    {
      label: 'Tipos de puntos',
      value: tipos.stats.total,
      icon: <CategoryIcon />,
    },
    {
      label: 'Materiales registrados',
      value: tipos.stats.materiales,
      icon: <Inventory2Icon />,
    },
    {
      label: 'Puntos asignados',
      value: tipos.stats.puntosAsignados,
      icon: <LocationOnIcon />,
    },
  ]

  return (
    <section className="admin-types" aria-labelledby="admin-types-title">
      <div className="admin-types-stats">
        {stats.map((stat) => (
          <article className="admin-types-stat" key={stat.label}>
            <span className="admin-types-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-types-stat-label">{stat.label}</span>
              <strong className="admin-types-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-types-panel">
        <div className="admin-types-toolbar">
          <TextField
            className="admin-types-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Nombre o material"
            value={tipos.search}
            onChange={(event) => tipos.setSearch(event.target.value)}
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

          <Button
            variant="contained"
            color="success"
            className="admin-types-add"
            startIcon={<AddIcon />}
            onClick={tipos.openCreate}
          >
            Agregar tipo
          </Button>
        </div>

        <div className="admin-types-table-header">
          <div>
            <h3 id="admin-types-title">Tipos de puntos limpios</h3>
            <p>Categorías disponibles y los materiales que recibe cada una.</p>
          </div>
          <span className="admin-types-count">
            {tipos.filteredTipos.length} de {tipos.tipos.length}
          </span>
        </div>

        {tipos.filteredTipos.length === 0 ? (
          <div className="admin-types-empty">
            <CategoryIcon className="admin-types-empty-icon" aria-hidden="true" />
            <h4>
              {tipos.tipos.length === 0
                ? 'Todavía no hay tipos registrados'
                : 'No encontramos tipos'}
            </h4>
            <p>
              {tipos.tipos.length === 0
                ? 'Agregá el primer tipo para clasificar los puntos limpios.'
                : 'Probá con otra búsqueda.'}
            </p>
            {tipos.tipos.length === 0 ? (
              <Button variant="contained" color="success" onClick={tipos.openCreate}>
                Agregar tipo
              </Button>
            ) : (
              <Button color="success" onClick={() => tipos.setSearch('')}>
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          <TableContainer>
            <Table
              className="admin-types-table"
              aria-label="Tipos de puntos limpios"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Materiales</TableCell>
                  <TableCell>Puntos asociados</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tipos.filteredTipos.map((tipo) => {
                  const tipoIndex = tipos.tipos.findIndex(
                    (item) => item.id === tipo.id,
                  )
                  const tone = tipoToneClass(tipoIndex)
                  const usos = tipos.usageCount(tipo.id)

                  return (
                    <TableRow key={tipo.id} hover>
                      <TableCell>
                        <div className="admin-types-identity">
                          <span
                            className={`admin-types-marker ${tone}`}
                            aria-hidden="true"
                          >
                            {tipo.logo ? (
                              <img
                                src={puntoLimpioIconSrc(tipo.logo, tipo.colorFondo)}
                                alt={`Logo de ${tipo.nombre}`}
                                className="admin-types-marker-img"
                              />
                            ) : (
                              <CategoryIcon fontSize="small" />
                            )}
                          </span>
                          <span className="admin-types-name">
                            {tipo.nombre}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="admin-types-materials">
                          {tipo.materiales.slice(0, 3).map((material) => (
                            <Chip
                              key={material}
                              size="small"
                              label={material}
                              className="admin-types-material"
                            />
                          ))}
                          {tipo.materiales.length > 3 && (
                            <span className="admin-types-muted">
                              +{tipo.materiales.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`admin-types-usage ${
                            usos > 0 ? 'has-usage' : ''
                          }`}
                        >
                          {usos} {usos === 1 ? 'punto' : 'puntos'}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <div className="admin-types-actions">
                          <Tooltip title="Ver detalle">
                            <IconButton
                              size="small"
                              aria-label={`Ver detalle de ${tipo.nombre}`}
                              onClick={() => setDetailTipo(tipo)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar tipo">
                            <IconButton
                              size="small"
                              aria-label={`Editar ${tipo.nombre}`}
                              onClick={() => tipos.startEdit(tipo)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Eliminar tipo">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Eliminar ${tipo.nombre}`}
                              onClick={() => tipos.requestDelete(tipo)}
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
        open={Boolean(detailTipo)}
        onClose={() => setDetailTipo(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-types-detail-title"
      >
        <DialogTitle id="admin-types-detail-title">
          Ficha del tipo
        </DialogTitle>
        <DialogContent dividers>
          {detailTipo && (
            <>
              <div className="admin-types-detail-header">
                <span
                  className={`admin-types-detail-marker ${tipoToneClass(
                    detailIndex,
                  )}`}
                  aria-hidden="true"
                >
                  {detailTipo.logo ? (
                    <img
                      src={puntoLimpioIconSrc(detailTipo.logo, detailTipo.colorFondo)}
                      alt={`Logo de ${detailTipo.nombre}`}
                      className="admin-types-detail-logo-img"
                    />
                  ) : (
                    <CategoryIcon />
                  )}
                </span>
                <div>
                  <h3>{detailTipo.nombre}</h3>
                  <p>
                    {tipos.usageCount(detailTipo.id)}{' '}
                    {tipos.usageCount(detailTipo.id) === 1
                      ? 'punto asociado'
                      : 'puntos asociados'}
                  </p>
                </div>
              </div>

              <h4 className="admin-types-detail-subtitle">
                Materiales que recibe
              </h4>
              <div className="admin-types-materials">
                {detailTipo.materiales.map((material) => (
                  <Chip
                    key={material}
                    size="small"
                    label={material}
                    className="admin-types-material"
                  />
                ))}
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDetailTipo(null)}>
            Cerrar
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => {
              if (detailTipo) {
                setDetailTipo(null)
                tipos.startEdit(detailTipo)
              }
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isEditing}
        onClose={tipos.closeForm}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-types-form-title"
      >
        <DialogTitle id="admin-types-form-title">
          {tipos.editing ? 'Editar tipo' : 'Agregar tipo'}
        </DialogTitle>
        <DialogContent dividers>
          <form
            id="admin-types-form"
            className="admin-types-form"
            onSubmit={tipos.save}
            noValidate
          >
            {tipos.formError && (
              <Alert severity="error" className="admin-types-form-alert">
                {tipos.formError}
              </Alert>
            )}

            <TextField
              label="Nombre del tipo"
              required
              color="success"
              placeholder="Punto Limpio"
              slotProps={{ htmlInput: { maxLength: 50 } }}
              disabled={tipos.saving}
              error={Boolean(tipos.fieldErrors.nombre)}
              helperText={tipos.fieldErrors.nombre?.[0]}
              value={tipos.form.nombre}
              onChange={(event) => tipos.updateNombre(event.target.value)}
            />

            <div className="admin-types-logo-field">
              <div className="admin-types-logo-header">
                <div>
                  <span className="admin-types-field-label">
                    Logo del tipo de punto limpio
                  </span>
                  <p className="admin-types-logo-desc">
                    Elegí el ícono que identificará este tipo en el mapa.
                  </p>
                </div>
                {tipos.form.logo && (
                  <div className="admin-types-logo-selected-badge">
                    <img
                      src={puntoLimpioIconSrc(tipos.form.logo, tipos.form.colorFondo)}
                      alt="Logo seleccionado"
                      className="admin-types-logo-selected-img"
                    />
                    <span>
                      {APP_LOGOS_PUNTOS_LIMPIOS.find(
                        (item) => item.src === tipos.form.logo,
                      )?.label ?? 'Seleccionado'}
                    </span>
                  </div>
                )}
              </div>

              <div className="admin-types-preset-grid">
                {APP_LOGOS_PUNTOS_LIMPIOS.map((preset) => {
                  const isSelected = tipos.form.logo === preset.src
                  return (
                    <Button
                      type="button"
                      key={preset.id}
                      className={`admin-types-preset-btn ${
                        isSelected ? 'is-selected' : ''
                      }`}
                      onClick={() => tipos.updateLogo(preset.src)}
                      disabled={tipos.saving}
                      aria-pressed={isSelected}
                      title={preset.label}
                    >
                      <img src={puntoLimpioIconSrc(preset.src, tipos.form.colorFondo)} alt={preset.label} />
                      <span className="admin-types-preset-name">
                        {preset.label}
                      </span>
                    </Button>
                  )
                })}
              </div>
              <div className="admin-types-colors">
                <span className="admin-types-field-label">Color del fondo</span>
                <ToggleButtonGroup
                  exclusive
                  className="admin-types-color-picker"
                  aria-label="Color del fondo del ícono"
                  value={tipos.form.colorFondo}
                  onChange={(_event, value: string | null) => {
                    if (value) tipos.updateColorFondo(value)
                  }}
                  disabled={tipos.saving}
                >
                  {colors.map((color) => (
                    <ToggleButton
                      key={color.value}
                      value={color.value}
                      aria-label={color.label}
                      title={color.label}
                      className="admin-types-color-option"
                      style={{ '--icon-color': color.value } as CSSProperties}
                    >
                      {tipos.form.colorFondo === color.value && <CheckIcon fontSize="small" />}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
            </div>

            <div className="admin-types-materials-editor">
              <span className="admin-types-materials-label">
                Materiales que recibe
              </span>

              {tipos.form.materiales.map((material, index) => (
                <div className="admin-types-material-row" key={index}>
                  <TextField
                    size="small"
                    color="success"
                    label={`Material ${index + 1}`}
                    value={material}
                    slotProps={{ htmlInput: { maxLength: 50 } }}
                    disabled={tipos.saving}
                    onChange={(event) =>
                      tipos.updateMaterial(index, event.target.value)
                    }
                  />
                  <Tooltip
                    title={
                      tipos.form.materiales.length === 1
                        ? 'Cada tipo necesita al menos un material'
                        : 'Eliminar material'
                    }
                  >
                    <span>
                      <IconButton
                        color="error"
                        aria-label={`Eliminar material ${index + 1}`}
                        disabled={
                          tipos.saving || tipos.form.materiales.length === 1
                        }
                        onClick={() => tipos.removeMaterial(index)}
                      >
                        <DeleteOutlineOutlinedIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              ))}

              <Button
                color="success"
                startIcon={<AddIcon />}
                disabled={tipos.saving}
                onClick={tipos.addMaterial}
              >
                Agregar material
              </Button>
            </div>
          </form>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={tipos.closeForm}
            disabled={tipos.saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-types-form"
            variant="contained"
            color="success"
            disabled={tipos.saving}
            startIcon={tipos.saving ? undefined : <EditIcon />}
          >
            {tipos.saving
              ? 'Guardando…'
              : tipos.editing
                ? 'Guardar cambios'
                : 'Agregar tipo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(tipos.pendingDelete)}
        onClose={tipos.cancelDelete}
        fullWidth
        maxWidth="xs"
        aria-labelledby="admin-types-delete-title"
      >
        <DialogTitle id="admin-types-delete-title">
          Eliminar tipo
        </DialogTitle>
        <DialogContent dividers>
          {tipos.deleteError && (
            <Alert severity="error" className="admin-types-delete-error">
              {tipos.deleteError}
            </Alert>
          )}
          <p>
            ¿Seguro que querés eliminar el tipo{' '}
            <strong>{tipos.pendingDelete?.nombre ?? ''}</strong>? Esta acción
            no se puede deshacer.
          </p>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={tipos.cancelDelete}
            disabled={tipos.deleting}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={tipos.confirmDelete}
            disabled={tipos.deleting}
          >
            {tipos.deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(tipos.notice)}
        autoHideDuration={4000}
        onClose={tipos.dismissNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={tipos.dismissNotice}
        >
          {tipos.notice}
        </Alert>
      </Snackbar>
    </section>
  )
}

export default AdminTiposPuntosLimpios
