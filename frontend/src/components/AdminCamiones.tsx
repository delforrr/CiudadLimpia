import { useState, useEffect, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
import BuildIcon from '@mui/icons-material/Build'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PersonIcon from '@mui/icons-material/Person'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import RouteIcon from '@mui/icons-material/Route'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { sincronizarFlota } from '../services/flotaService.ts'
import type { Localidad, Trayecto as TrayectoGuardado } from '../services/trayectosService'
import { DetalleTrayecto } from './AdminTrayectos'
import { AsignarConductorDialog } from './AsignarConductorDialog'
import {
  asignacionesCamion, asignarConductor, formatoContrato, quitarConductor,
  type AsignacionConductor, type ContratoConductor,
} from '../utils/contratoConductor'
import './AdminCamiones.css'

export type TruckStatus = 'OPERATIVO' | 'MANTENIMIENTO' | 'INACTIVO'

// Modelo de Trayecto (1 Camión -> N Trayectos según Diagrama de Clases)
export interface Trayecto {
  id: string
  name: string
}

// Modelo de Camion: asociado a Trayectos y a varios Conductores (uno por contrato)
export interface Truck {
  id: string
  code: string // Identificador interno / IdCamion
  plate: string // Patente
  brand: string // Marca
  model: string // Modelo
  year: number // Año
  conductores: AsignacionConductor[] // Conductores con su contrato (inicio y fin opcional)
  status: TruckStatus // Estado
  trayectos: Trayecto[] // Lista de trayectos asignados al camión
}

export interface AdminCamionesProps {
  trayectosDisponibles?: TrayectoGuardado[]
  localidades?: Localidad[]
  cargandoTrayectos?: boolean
  errorTrayectos?: string
  recargarTrayectos?: () => void
}

const STORAGE_KEY = 'ciudad-limpia:camiones'
const trayectosDeEjemplo = new Set(['tr-001', 'tr-002', 'tr-003', 'tr-004'])

function loadSystemDrivers(): string[] {
  try {
    const raw = localStorage.getItem('ciudad-limpia:choferes')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return []
    return parsed
      .map((d: { firstName?: string; lastName?: string }) =>
        `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim(),
      )
      .filter(Boolean)
  } catch {
    return []
  }
}

function loadTrucks(): Truck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Truck[]
    if (!Array.isArray(parsed) || parsed.length === 0) return []
    return parsed.map((t) => ({
      ...t,
      conductores: asignacionesCamion(t),
      trayectos: Array.isArray(t.trayectos)
        ? t.trayectos.filter((trayecto) => !trayectosDeEjemplo.has(trayecto.id))
        : [],
    }))
  } catch {
    return []
  }
}

function saveTrucks(trucks: Truck[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trucks))
  } catch {
    // ignorar errores de almacenamiento
  }
}

function sincronizarChoferes(flota: Truck[]) {
  try {
    const raw = localStorage.getItem('ciudad-limpia:choferes')
    if (!raw) return
    const choferes = JSON.parse(raw)
    if (!Array.isArray(choferes)) return
    const porNombre = new Map<string, { codigo: string; contrato?: ContratoConductor }>()
    for (const camion of flota) {
      for (const { nombre, contrato } of asignacionesCamion(camion)) {
        porNombre.set(nombre, { codigo: camion.code, contrato })
      }
    }
    const actualizados = choferes.map((chofer: {
      firstName?: string; lastName?: string; assignedTruck?: string | null; contrato?: ContratoConductor; status?: string
    }) => {
      const nombre = `${chofer.firstName ?? ''} ${chofer.lastName ?? ''}`.trim()
      const asignacion = porNombre.get(nombre)
      if (asignacion) {
        return { ...chofer, status: 'ACTIVO', assignedTruck: asignacion.codigo, contrato: asignacion.contrato }
      }
      if (chofer.assignedTruck || chofer.contrato) {
        return { ...chofer, status: 'INACTIVO', assignedTruck: null, contrato: undefined }
      }
      return { ...chofer, status: chofer.assignedTruck ? 'ACTIVO' : 'INACTIVO' }
    })
    localStorage.setItem('ciudad-limpia:choferes', JSON.stringify(actualizados))
  } catch {
    // Mantener el comportamiento local si el navegador no permite almacenamiento.
  }
}

const STATUS_LABELS: Record<TruckStatus, string> = {
  OPERATIVO: 'Operativo',
  MANTENIMIENTO: 'Mantenimiento',
  INACTIVO: 'Fuera de servicio',
}

function statusChipClass(status: TruckStatus) {
  if (status === 'OPERATIVO') return 'is-active'
  if (status === 'MANTENIMIENTO') return 'is-warning'
  return 'is-inactive'
}

type TruckFormState = {
  code: string
  plate: string
  brand: string
  model: string
  year: number | string
  status: TruckStatus
}

const DEFAULT_FORM: TruckFormState = {
  code: '',
  plate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  status: 'OPERATIVO',
}

function normalizarBusqueda(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function AdminCamiones({
  trayectosDisponibles = [], localidades = [], cargandoTrayectos, errorTrayectos, recargarTrayectos,
}: AdminCamionesProps) {
  const [trucks, setTrucks] = useState<Truck[]>(loadTrucks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | TruckStatus>('TODOS')

  // Modales
  const [detailTruck, setDetailTruck] = useState<Truck | null>(null)
  const [camionParaTrayectosId, setCamionParaTrayectosId] = useState<string | null>(null)
  const [busquedaTrayectos, setBusquedaTrayectos] = useState('')
  const [trayectoPrevia, setTrayectoPrevia] = useState<TrayectoGuardado | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null)
  const [pendingDeleteTruck, setPendingDeleteTruck] = useState<Truck | null>(null)
  const [asignacionPendiente, setAsignacionPendiente] = useState<Truck | null>(null)
  const [systemDrivers, setSystemDrivers] = useState<string[]>(loadSystemDrivers)

  useEffect(() => {
    let activo = true
    sincronizarFlota()
      .then(({ trucks: remotos, drivers: remotosDrivers }) => {
        if (!activo || remotos.length === 0) return
        setTrucks(remotos)
        setSystemDrivers(remotosDrivers.map(({ firstName, lastName }) =>
          `${firstName} ${lastName}`.trim()))
      })
      .catch(() => {})
    return () => { activo = false }
  }, [])

  // Formulario
  const [form, setForm] = useState<TruckFormState>(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof TruckFormState, string>>
  >({})

  // Feedback
  const [notice, setNotice] = useState('')
  const camionParaTrayectos = trucks.find(({ id }) => id === camionParaTrayectosId)
  const opcionesTrayectos = new Map(camionParaTrayectos?.trayectos.map(({ id, name }) => [id, name]))
  const catalogoTrayectos = new Map(trayectosDisponibles.map((trayecto) => [trayecto.id, trayecto]))
  for (const { id, nombre } of catalogoTrayectos.values()) opcionesTrayectos.set(id, nombre)
  const idsAsignados = camionParaTrayectos?.trayectos.map(({ id }) => id) ?? []
  const filtroTrayectos = normalizarBusqueda(busquedaTrayectos)
  const trayectosFiltrados = [...opcionesTrayectos].filter(([id, nombre]) =>
    filtroTrayectos ? normalizarBusqueda(nombre).includes(filtroTrayectos) : idsAsignados.includes(id))

  const abrirAsignacionTrayectos = (truck: Truck) => {
    setBusquedaTrayectos('')
    setCamionParaTrayectosId(truck.id)
  }

  const asignarTrayectos = (truck: Truck, ids: string[]) => {
    const trayectos = ids.map((id) => ({ id, name: opcionesTrayectos.get(id) ?? id }))
    const actualizado = { ...truck, trayectos }
    const flota = trucks.map((unidad) => unidad.id === truck.id ? actualizado : unidad)
    setTrucks(flota)
    saveTrucks(flota)
    setDetailTruck((detalle) => detalle?.id === truck.id ? actualizado : detalle)
  }

  // Métricas
  const total = trucks.length
  const operativos = trucks.filter((t) => t.status === 'OPERATIVO').length
  const mantenimiento = trucks.filter((t) => t.status === 'MANTENIMIENTO').length
  const inactivos = trucks.filter((t) => t.status === 'INACTIVO').length

  const stats = [
    {
      label: 'Camiones totales',
      value: total,
      icon: <LocalShippingIcon />,
    },
    {
      label: 'Operativos',
      value: operativos,
      icon: <CheckCircleIcon />,
    },
    {
      label: 'En mantenimiento',
      value: mantenimiento,
      icon: <BuildIcon />,
    },
    {
      label: 'Fuera de servicio',
      value: inactivos,
      icon: <ReportProblemOutlinedIcon />,
    },
  ]

  const filteredTrucks = trucks.filter((truck) => {
    const term = search.toLowerCase().trim()
    const matchesSearch =
      term === '' ||
      truck.code.toLowerCase().includes(term) ||
      truck.plate.toLowerCase().includes(term) ||
      truck.brand.toLowerCase().includes(term) ||
      truck.model.toLowerCase().includes(term) ||
      asignacionesCamion(truck).some(({ nombre }) => nombre.toLowerCase().includes(term))

    const matchesStatus =
      statusFilter === 'TODOS' || truck.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Acciones de formulario
  const handleOpenCreate = () => {
    setEditingTruck(null)
    setForm({
      code: `Camión ${String(trucks.length + 1).padStart(2, '0')}`,
      plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      status: 'OPERATIVO',
    })
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleOpenEdit = (truck: Truck) => {
    setEditingTruck(truck)
    setForm({
      code: truck.code,
      plate: truck.plate,
      brand: truck.brand,
      model: truck.model,
      year: truck.year,
      status: truck.status,
    })
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingTruck(null)
    setFormErrors({})
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()

    const errors: Partial<Record<keyof TruckFormState, string>> = {}
    if (!form.code.trim()) errors.code = 'Ingresá el número o código de unidad'
    if (!form.plate.trim()) errors.plate = 'Ingresá la patente del camión'
    if (!form.brand.trim()) errors.brand = 'Ingresá la marca'
    if (!form.model.trim()) errors.model = 'Ingresá el modelo'
    const parsedYear = Number(form.year)
    if (
      !parsedYear ||
      parsedYear < 1980 ||
      parsedYear > new Date().getFullYear() + 1
    ) {
      errors.year = 'Ingresá un año válido'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (editingTruck) {
      // Actualizar camión existente conservando conductores y trayectos
      const updated = trucks.map((camion) => camion.id === editingTruck.id ? {
        ...camion,
        code: editingTruck.code,
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: parsedYear,
        status: form.status,
      } : camion)
      const actualizado = updated.find((camion) => camion.id === editingTruck.id) ?? editingTruck
      setTrucks(updated)
      saveTrucks(updated)
      setDetailTruck((detalle) => detalle?.id === actualizado.id ? actualizado : detalle)
      sincronizarChoferes(updated)
      setNotice(`Se actualizaron los datos de ${editingTruck.code}.`)
    } else {
      // Crear nuevo camión: sin conductores, se asignan después desde el listado.
      const newTruck: Truck = {
        id: `t-${Date.now()}`,
        code: form.code.trim(),
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: parsedYear,
        conductores: [],
        status: 'OPERATIVO',
        trayectos: [],
      }
      const updated = [newTruck, ...trucks]
      setTrucks(updated)
      saveTrucks(updated)
      setNotice(`Camión ${newTruck.code} agregado correctamente.`)
    }

    handleCloseForm()
  }

  const handleDelete = () => {
    if (!pendingDeleteTruck) return
    const updated = trucks.filter((t) => t.id !== pendingDeleteTruck.id)
    setTrucks(updated)
    saveTrucks(updated)
    setNotice(`Se eliminó la unidad ${pendingDeleteTruck.code}.`)
    setPendingDeleteTruck(null)
    if (detailTruck?.id === pendingDeleteTruck.id) {
      setDetailTruck(null)
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('TODOS')
  }

  const confirmarAsignacionConductor = (truck: Truck, nombre: string, contrato: ContratoConductor) => {
    const updated = asignarConductor(trucks, truck, nombre, contrato)
    const updatedTruck = updated.find((camion) => camion.id === truck.id) ?? truck
    setTrucks(updated)
    saveTrucks(updated)
    setDetailTruck((detalle) => detalle?.id === truck.id ? updatedTruck : detalle)
    sincronizarChoferes(updated)
    setNotice(`Se asignó a ${nombre} a ${truck.code}.`)
  }

  const handleQuitarConductor = (truck: Truck, nombre: string) => {
    const updated = quitarConductor(trucks, truck.id, nombre)
    const updatedTruck = updated.find((camion) => camion.id === truck.id) ?? truck
    setTrucks(updated)
    saveTrucks(updated)
    setDetailTruck(updatedTruck)
    sincronizarChoferes(updated)
    setNotice(`Se desvinculó a ${nombre} de ${truck.code}.`)
  }

  const abrirAsignacion = (truck: Truck) => setAsignacionPendiente(truck)

  return (
    <section className="admin-trucks" aria-labelledby="admin-trucks-title">
      {/* Tarjetas de estadísticas / resumen */}
      <div className="admin-trucks-stats admin-module-stats">
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
      </div>

      {/* Panel principal de Camiones */}
      <div className="admin-trucks-panel admin-module-panel">
        <div className="admin-trucks-toolbar admin-module-toolbar">
          <TextField
            className="admin-trucks-search admin-module-search"
            size="small"
            color="success"
            label="Buscar"
            placeholder="Código, patente, marca, modelo o chofer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'TODOS' | TruckStatus)
              }
            >
              <MenuItem value="TODOS">Todos los estados</MenuItem>
              <MenuItem value="OPERATIVO">Operativos</MenuItem>
              <MenuItem value="MANTENIMIENTO">En mantenimiento</MenuItem>
              <MenuItem value="INACTIVO">Fuera de servicio</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            className="admin-trucks-add"
            onClick={handleOpenCreate}
          >
            Agregar camión
          </Button>
        </div>

        {/* Encabezado del listado con contador idéntico a choferes y puntos limpios */}
        <div className="admin-trucks-table-header">
          <div>
            <h3 id="admin-trucks-title">Flota de camiones</h3>
            <p>Unidades registradas para la recolección municipal de residuos.</p>
          </div>
          <span className="admin-trucks-count">
            {filteredTrucks.length} de {trucks.length}
          </span>
        </div>

        {/* Tabla: Unidad/Patente con icono marker, Marca, Modelo, Año, Conductor, Estado y Acciones */}
        {filteredTrucks.length === 0 ? (
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
                onClick={handleOpenCreate}
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
                  <TableCell>Unidad / Patente</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell>Modelo</TableCell>
                  <TableCell>Año</TableCell>
                  <TableCell>Conductor</TableCell>
                  <TableCell>Trayectos</TableCell>
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
                          <span className="admin-trucks-name">{truck.code}</span>
                          <span className="admin-trucks-subtext">{truck.plate}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="admin-trucks-cell-text">{truck.brand}</span>
                    </TableCell>
                    <TableCell>
                      <span className="admin-trucks-cell-text">{truck.model}</span>
                    </TableCell>
                    <TableCell>
                      <span className="admin-trucks-cell-subtext">{truck.year}</span>
                    </TableCell>
                    <TableCell>
                      <div className="admin-trucks-drivers-cell">
                        {asignacionesCamion(truck).map(({ nombre }) => (
                          <span className="admin-trucks-driver" key={nombre}>
                            <PersonIcon fontSize="small" aria-hidden="true" />
                            {nombre}
                          </span>
                        ))}
                        {asignacionesCamion(truck).length === 0 && (
                          <Tooltip title={`Asignar conductor a ${truck.code}`}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<AddIcon />}
                              className="admin-trucks-assign-btn"
                              aria-label={`Asignar conductor a ${truck.code}`}
                              onClick={() => abrirAsignacion(truck)}
                            >
                              Asignar
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {truck.trayectos.length === 0 ? (
                        <Button size="small" variant="outlined" color="success" startIcon={<AddIcon />}
                          className="admin-trucks-assign-btn" aria-label={`Asignar trayectos a ${truck.code}`}
                          onClick={() => abrirAsignacionTrayectos(truck)}>
                          Asignar
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          color="success"
                          className="admin-trucks-trayectos-count"
                          aria-label={`Gestionar trayectos de ${truck.code}`}
                          onClick={() => abrirAsignacionTrayectos(truck)}
                        >
                          {truck.trayectos.length === 1 ? '1 trayecto' : `${truck.trayectos.length} trayectos`}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABELS[truck.status]}
                        className={`admin-trucks-status ${statusChipClass(truck.status)}`}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div className="admin-trucks-actions">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            aria-label={`Ver detalle de ${truck.code}`}
                            onClick={() => setDetailTruck(truck)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar camión">
                          <IconButton
                            size="small"
                            aria-label={`Editar ${truck.code}`}
                            onClick={() => handleOpenEdit(truck)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar camión">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Eliminar ${truck.code}`}
                            onClick={() => setPendingDeleteTruck(truck)}
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

      {asignacionPendiente && <AsignarConductorDialog
        key={asignacionPendiente.id}
        unidad={asignacionPendiente.code}
        conductores={systemDrivers}
        onCerrar={() => setAsignacionPendiente(null)}
        onConfirmar={(nombre, contrato) => {
          confirmarAsignacionConductor(asignacionPendiente, nombre, contrato)
          setAsignacionPendiente(null)
        }}
      />}

      {/* Modal Ficha Detalle: datos generales y sus trayectos asociados */}
      <Dialog
        className="admin-module-dialog"
        open={Boolean(detailTruck)}
        onClose={() => setDetailTruck(null)}
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
                  <h3>{detailTruck.code}</h3>
                  <p>Patente {detailTruck.plate}</p>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[detailTruck.status]}
                    className={`admin-trucks-status ${statusChipClass(detailTruck.status)}`}
                  />
                </div>
              </div>

              {/* Datos del camión: Marca/Modelo, Año y conductores */}
              <div className="admin-trucks-detail-grid">
                <article className="admin-trucks-detail-card">
                  <h4>Marca y Modelo</h4>
                  <p>
                    <DirectionsCarIcon fontSize="small" />
                    {detailTruck.brand} {detailTruck.model}
                  </p>
                </article>

                <article className="admin-trucks-detail-card">
                  <h4>Año de fabricación</h4>
                  <p>
                    <CalendarMonthIcon fontSize="small" />
                    {detailTruck.year}
                  </p>
                </article>

                <article className="admin-trucks-detail-card">
                  <h4>Conductores ({asignacionesCamion(detailTruck).length})</h4>
                  <p>
                    <PersonIcon fontSize="small" />
                    {asignacionesCamion(detailTruck).length > 0
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
                    onClick={() => abrirAsignacion(detailTruck)}
                  >
                    Asignar
                  </Button>
                </div>
                {asignacionesCamion(detailTruck).map(({ nombre, contrato }) => (
                  <div className="admin-trucks-conductor-item" key={nombre}>
                    <div>
                      <strong>{nombre}</strong>
                      <span>{formatoContrato(contrato)}</span>
                    </div>
                    <Tooltip title={`Desvincular a ${nombre} de ${detailTruck.code}`}>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Desvincular a ${nombre} de ${detailTruck.code}`}
                        onClick={() => handleQuitarConductor(detailTruck, nombre)}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                ))}
              </div>

              {/* Sección de Trayectos Asignados */}
              <div className="admin-trucks-trayectos-section">
                <div className="admin-trucks-trayectos-header">
                  <h4>Trayectos asignados ({detailTruck.trayectos.length})</h4>
                </div>

                {detailTruck.trayectos.length > 0 && (
                  <p className="admin-trucks-trayectos-nombres">
                    {detailTruck.trayectos.map(({ id, name }) => catalogoTrayectos.get(id)?.nombre ?? name).join(', ')}
                  </p>
                )}
                <Button size="small" variant="outlined" color="success" startIcon={<RouteIcon />}
                  onClick={() => abrirAsignacionTrayectos(detailTruck)}>
                  Asignar trayectos
                </Button>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDetailTruck(null)}>
            Cerrar
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => {
              if (detailTruck) {
                const tr = detailTruck
                setDetailTruck(null)
                handleOpenEdit(tr)
              }
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog className="admin-module-dialog" open={Boolean(camionParaTrayectos)} fullWidth maxWidth="sm"
        aria-labelledby="admin-trucks-asignar-trayectos-title"
        onClose={() => setCamionParaTrayectosId(null)}>
        <DialogTitle id="admin-trucks-asignar-trayectos-title">
          Asignar trayectos a {camionParaTrayectos?.code}
        </DialogTitle>
        {camionParaTrayectos && (
          <DialogContent>
            <TextField label="Buscar trayecto" type="search" fullWidth size="small" autoFocus
              margin="dense" value={busquedaTrayectos} onChange={(event) => setBusquedaTrayectos(event.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }} />
            {errorTrayectos ? (
              <Alert severity="warning" action={recargarTrayectos &&
                <Button color="inherit" size="small" onClick={recargarTrayectos}>Reintentar</Button>}>
                No se pudieron cargar los trayectos guardados.
              </Alert>
            ) : cargandoTrayectos ? (
              <p role="status">Cargando trayectos…</p>
            ) : filtroTrayectos && opcionesTrayectos.size > 0 && trayectosFiltrados.length === 0 ? (
              <p role="status">No encontramos trayectos con esa búsqueda.</p>
            ) : null}
            {trayectosFiltrados.length > 0 && (
              <ul className="admin-trucks-trayectos-opciones">
                {trayectosFiltrados.map(([id, nombre]) => {
                  const disponible = catalogoTrayectos.get(id)
                  return (
                    <li key={id}>
                      <FormControlLabel label={nombre}
                        control={<Checkbox color="success" size="small" checked={idsAsignados.includes(id)}
                          onChange={(_, checked) => asignarTrayectos(camionParaTrayectos,
                            checked ? [...idsAsignados, id] : idsAsignados.filter((asignado) => asignado !== id))} />} />
                      {disponible && <Button size="small" color="success" startIcon={<VisibilityIcon />}
                        aria-label={`Ver detalle de ${nombre}`} onClick={() => setTrayectoPrevia(disponible)}>
                        Ver detalle
                      </Button>}
                    </li>
                  )
                })}
              </ul>
            )}
          </DialogContent>
        )}
        <DialogActions>
          <Button variant="contained" color="success" onClick={() => setCamionParaTrayectosId(null)}>Listo</Button>
        </DialogActions>
      </Dialog>

      <Dialog className="admin-module-dialog" open={Boolean(trayectoPrevia)} fullWidth maxWidth="lg"
        slotProps={{ paper: { 'aria-label': 'Vista previa del trayecto' } }}
        onClose={() => setTrayectoPrevia(null)}>
        {trayectoPrevia && (
          <DialogContent className="admin-trucks-trayecto-previa">
            <DetalleTrayecto trayecto={trayectoPrevia} localidad={localidades.find(({ id }) =>
              id === trayectoPrevia.localidadId)?.nombre ?? trayectoPrevia.localidadId} />
          </DialogContent>
        )}
        <DialogActions>
          <Button color="success" onClick={() => setTrayectoPrevia(null)}>Volver a la selección</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Agregar / Editar Camión */}
      <Dialog
        className="admin-module-dialog"
        open={isFormOpen}
        onClose={handleCloseForm}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-trucks-form-title"
      >
        <DialogTitle id="admin-trucks-form-title">
          {editingTruck ? `Editar camión` : 'Agregar camión'}
        </DialogTitle>
        <DialogContent dividers>
          <form
            id="admin-trucks-form"
            className="admin-trucks-form"
            onSubmit={handleSave}
            noValidate
          >
            <TextField
              className="admin-trucks-form-full"
              label="Identificador / Código"
              placeholder="Ej: Camión 05"
              color="success"
              fullWidth
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              error={Boolean(formErrors.code)}
              helperText={formErrors.code || (editingTruck
                ? 'El identificador es la clave primaria y no se puede cambiar.'
                : undefined)}
              disabled={Boolean(editingTruck)}
              required={!editingTruck}
            />

            <TextField
              label="Patente"
              placeholder="Ej: AE 123 CD"
              color="success"
              fullWidth
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              error={Boolean(formErrors.plate)}
              helperText={formErrors.plate}
              required
            />

            <TextField
              label="Año"
              type="number"
              placeholder="Ej: 2022"
              color="success"
              fullWidth
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              error={Boolean(formErrors.year)}
              helperText={formErrors.year}
              required
            />

            <TextField
              label="Marca"
              placeholder="Ej: Iveco"
              color="success"
              fullWidth
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              error={Boolean(formErrors.brand)}
              helperText={formErrors.brand}
              required
            />

            <TextField
              label="Modelo"
              placeholder="Ej: Tector 170E28"
              color="success"
              fullWidth
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              error={Boolean(formErrors.model)}
              helperText={formErrors.model}
              required
            />

            {/* El estado solo aparece cuando se edita un camión existente */}
            {editingTruck && (
              <FormControl color="success" fullWidth>
                <InputLabel id="truck-status-select-label">Estado</InputLabel>
                <Select
                  labelId="truck-status-select-label"
                  id="truck-status-select"
                  label="Estado"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as TruckStatus })
                  }
                >
                  <MenuItem value="OPERATIVO">Operativo</MenuItem>
                  <MenuItem value="MANTENIMIENTO">En mantenimiento</MenuItem>
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
          <Button color="inherit" onClick={handleCloseForm}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-trucks-form"
            variant="contained"
            color="success"
            startIcon={<EditIcon />}
          >
            {editingTruck ? 'Guardar cambios' : 'Agregar camión'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Confirmación de Eliminación */}
      <Dialog
        className="admin-module-dialog"
        open={Boolean(pendingDeleteTruck)}
        onClose={() => setPendingDeleteTruck(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-truck-dialog-title"
      >
        <DialogTitle id="delete-truck-dialog-title">Eliminar camión</DialogTitle>
        <DialogContent dividers>
          {pendingDeleteTruck && (
            <p className="admin-trucks-delete-confirm-text">
              ¿Seguro que querés eliminar la unidad{' '}
              <strong>{pendingDeleteTruck.code}</strong> (patente{' '}
              {pendingDeleteTruck.plate})? Esta acción desvinculará sus trayectos
              asociados.
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPendingDeleteTruck(null)}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setNotice('')}
        >
          {notice}
        </Alert>
      </Snackbar>

    </section>
  )
}

export default AdminCamiones
