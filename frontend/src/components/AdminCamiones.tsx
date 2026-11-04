import { useState, useMemo, type FormEvent } from 'react'
import {
  Alert,
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
import './AdminCamiones.css'

export type TruckStatus = 'OPERATIVO' | 'MANTENIMIENTO' | 'INACTIVO'

// Modelo de Trayecto (1 Camión -> N Trayectos según Diagrama de Clases)
export interface Trayecto {
  id: string
  name: string
  zone: string
  schedule: string
  description: string
  activeDays: string
}

// Modelo de Camion: asociado a Trayectos y Conductor (no a Zona directamente)
export interface Truck {
  id: string
  code: string // Identificador interno / IdCamion
  plate: string // Patente
  brand: string // Marca
  model: string // Modelo
  year: number // Año
  assignedDriver: string // Conductor asignado (IdConductor)
  status: TruckStatus // Estado
  trayectos: Trayecto[] // Lista de trayectos asignados al camión
}

export interface AdminCamionesProps {
  onNavigateToTrayectos?: (truck?: Truck) => void
}

const STORAGE_KEY = 'ciudad-limpia:camiones'

const INITIAL_TRUCKS: Truck[] = [
  {
    id: 't-001',
    code: 'Camión 01',
    plate: 'AE 123 CD',
    brand: 'Iveco',
    model: 'Tector 170E28',
    year: 2022,
    assignedDriver: 'Carlos González',
    status: 'OPERATIVO',
    trayectos: [
      {
        id: 'tr-001',
        name: 'Trayecto Centro 1',
        zone: 'Zona 1 (Centro)',
        schedule: 'Turno Mañana (07:00 - 12:30)',
        description:
          'Av. Villegas, Gob. Irigoyen, 9 de Julio y cuadrante comercial céntrico',
        activeDays: 'Lunes a Viernes',
      },
      {
        id: 'tr-002',
        name: 'Trayecto Nocturno Refuerzo',
        zone: 'Zona 1 (Centro)',
        schedule: 'Turno Noche (20:00 - 00:00)',
        description: 'Zona gastronómica de calle Cuello y San Martín',
        activeDays: 'Martes, Jueves y Sábados',
      },
    ],
  },
  {
    id: 't-002',
    code: 'Camión 02',
    plate: 'AF 456 TL',
    brand: 'Mercedes-Benz',
    model: 'Atego 1726',
    year: 2023,
    assignedDriver: 'Miguel Rodríguez',
    status: 'OPERATIVO',
    trayectos: [
      {
        id: 'tr-003',
        name: 'Trayecto Norte - Parque Municipal',
        zone: 'Zona 2 (Norte)',
        schedule: 'Turno Mañana (07:30 - 13:00)',
        description:
          'Bº Norte, inmediaciones de Parque Conrado Villegas y Bulevar Pasteur',
        activeDays: 'Lunes a Sábados',
      },
    ],
  },
  {
    id: 't-003',
    code: 'Camión 03',
    plate: 'AD 789 ZX',
    brand: 'Volkswagen',
    model: 'Constellation 17.280',
    year: 2021,
    assignedDriver: 'Roberto López',
    status: 'OPERATIVO',
    trayectos: [
      {
        id: 'tr-004',
        name: 'Trayecto Sur y Acceso Rodríguez Mera',
        zone: 'Zona 3 (Sur)',
        schedule: 'Turno Tarde (14:00 - 19:30)',
        description: 'Bº Las Chozas, Acceso Sur y corredores periurbanos',
        activeDays: 'Lunes, Miércoles y Viernes',
      },
    ],
  },
  {
    id: 't-004',
    code: 'Camión 04',
    plate: 'AC 321 QR',
    brand: 'Ford',
    model: 'Cargo 1722',
    year: 2019,
    assignedDriver: 'Sin asignar',
    status: 'MANTENIMIENTO',
    trayectos: [],
  },
]

const AVAILABLE_DRIVERS = [
  'Sin asignar',
  'Carlos González',
  'Miguel Rodríguez',
  'Jorge Fernández',
  'Roberto López',
]

function loadSystemDrivers(): string[] {
  const fallback = [
    'Carlos González',
    'Miguel Rodríguez',
    'Jorge Fernández',
    'Roberto López',
  ]
  try {
    const raw = localStorage.getItem('ciudad-limpia:choferes')
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    const names = parsed
      .map((d: { firstName?: string; lastName?: string }) =>
        `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim(),
      )
      .filter(Boolean)
    return names.length > 0 ? names : fallback
  } catch {
    return fallback
  }
}

function loadTrucks(): Truck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_TRUCKS
    const parsed = JSON.parse(raw) as Truck[]
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_TRUCKS
    return parsed.map((t) => ({
      ...t,
      trayectos: Array.isArray(t.trayectos) ? t.trayectos : [],
    }))
  } catch {
    return INITIAL_TRUCKS
  }
}

function saveTrucks(trucks: Truck[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trucks))
  } catch {
    // ignorar errores de almacenamiento
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
  assignedDriver: string
  status: TruckStatus
}

const DEFAULT_FORM: TruckFormState = {
  code: '',
  plate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  assignedDriver: 'Sin asignar',
  status: 'OPERATIVO',
}

export function AdminCamiones({ onNavigateToTrayectos }: AdminCamionesProps) {
  const [trucks, setTrucks] = useState<Truck[]>(loadTrucks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | TruckStatus>('TODOS')

  // Modales
  const [detailTruck, setDetailTruck] = useState<Truck | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null)
  const [pendingDeleteTruck, setPendingDeleteTruck] = useState<Truck | null>(null)
  const [assignAnchor, setAssignAnchor] = useState<null | HTMLElement>(null)
  const [targetTruck, setTargetTruck] = useState<Truck | null>(null)
  const systemDrivers = useMemo(() => loadSystemDrivers(), [])

  // Formulario
  const [form, setForm] = useState<TruckFormState>(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof TruckFormState, string>>
  >({})

  // Feedback
  const [notice, setNotice] = useState('')

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
      truck.assignedDriver.toLowerCase().includes(term)

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
      assignedDriver: 'Sin asignar',
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
      assignedDriver: truck.assignedDriver,
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
      // Actualizar camión existente conservando trayectos
      const updated = trucks.map((t) =>
        t.id === editingTruck.id
          ? {
              ...t,
              code: form.code.trim(),
              plate: form.plate.trim().toUpperCase(),
              brand: form.brand.trim(),
              model: form.model.trim(),
              year: parsedYear,
              assignedDriver: form.assignedDriver,
              status: form.status,
            }
          : t,
      )
      setTrucks(updated)
      saveTrucks(updated)
      setNotice(`Se actualizaron los datos de ${form.code}.`)
    } else {
      // Crear nuevo camión: por defecto activo/operativo
      const newTruck: Truck = {
        id: `t-${Date.now()}`,
        code: form.code.trim(),
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: parsedYear,
        assignedDriver: form.assignedDriver,
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

  const handleGoToTrayectos = (truckToPass?: Truck) => {
    setDetailTruck(null)
    if (onNavigateToTrayectos) {
      onNavigateToTrayectos(truckToPass)
    }
  }

  const handleQuickAssignDriver = (truck: Truck, driverName: string) => {
    const updatedTruck = { ...truck, assignedDriver: driverName }
    const updated = trucks.map((t) => (t.id === truck.id ? updatedTruck : t))
    setTrucks(updated)
    saveTrucks(updated)
    setDetailTruck(updatedTruck)

    // Sincronizar con el almacenamiento de choferes si existe
    try {
      const raw = localStorage.getItem('ciudad-limpia:choferes')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const updatedDrivers = parsed.map((d: { firstName?: string; lastName?: string; assignedTruck?: string | null }) => {
            const fullName = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim()
            if (driverName !== 'Sin asignar' && fullName === driverName) {
              return { ...d, assignedTruck: truck.code }
            }
            if (d.assignedTruck === truck.code && (driverName === 'Sin asignar' || fullName !== driverName)) {
              return { ...d, assignedTruck: null }
            }
            return d
          })
          localStorage.setItem('ciudad-limpia:choferes', JSON.stringify(updatedDrivers))
        }
      }
    } catch {
      // ignorar errores de almacenamiento
    }

    if (driverName === 'Sin asignar') {
      setNotice(`Se desvinculó el conductor de ${truck.code}.`)
    } else {
      setNotice(`Se asignó a ${driverName} a ${truck.code}.`)
    }
  }

  const handleOpenAssignMenu = (
    event: React.MouseEvent<HTMLElement>,
    truck: Truck,
  ) => {
    event.stopPropagation()
    setAssignAnchor(event.currentTarget)
    setTargetTruck(truck)
  }

  const handleCloseAssignMenu = () => {
    setAssignAnchor(null)
    setTargetTruck(null)
  }

  const handleSelectDriver = (driverName: string) => {
    if (targetTruck) {
      handleQuickAssignDriver(targetTruck, driverName)
    }
    handleCloseAssignMenu()
  }

  return (
    <section className="admin-trucks" aria-labelledby="admin-trucks-title">
      {/* Tarjetas de estadísticas / resumen */}
      <div className="admin-trucks-stats">
        {stats.map((stat) => (
          <article className="admin-trucks-stat" key={stat.label}>
            <span className="admin-trucks-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <span className="admin-trucks-stat-label">{stat.label}</span>
              <strong className="admin-trucks-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
      </div>

      {/* Panel principal de Camiones */}
      <div className="admin-trucks-panel">
        <div className="admin-trucks-toolbar">
          <TextField
            className="admin-trucks-search"
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
            className="admin-trucks-filter"
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
          <TableContainer>
            <Table
              className="admin-trucks-table"
              aria-label="Tabla de camiones"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Unidad / Patente</TableCell>
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
                      {truck.assignedDriver !== 'Sin asignar' ? (
                        <div className="admin-trucks-driver">
                          <PersonIcon fontSize="small" aria-hidden="true" />
                          <span>{truck.assignedDriver}</span>
                        </div>
                      ) : (
                        <Tooltip title={`Asignar conductor a ${truck.code}`}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<AddIcon />}
                            className="admin-trucks-assign-btn"
                            onClick={(event) => handleOpenAssignMenu(event, truck)}
                          >
                            Asignar
                          </Button>
                        </Tooltip>
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

      {/* Modal Ficha Detalle: datos generales y sus trayectos asociados */}
      <Dialog
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

              {/* Datos del camión: Marca/Modelo, Año, Conductor */}
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
                  <h4>Conductor asignado</h4>
                  {detailTruck.assignedDriver !== 'Sin asignar' ? (
                    <div className="admin-trucks-driver-assigned-row">
                      <p>
                        <PersonIcon fontSize="small" />
                        {detailTruck.assignedDriver}
                      </p>
                      <Button
                        size="small"
                        color="success"
                        onClick={(e) => handleOpenAssignMenu(e, detailTruck)}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.72rem',
                          minWidth: 'auto',
                          p: '1px 6px',
                          ml: 'auto',
                        }}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="admin-trucks-driver-assigned-row">
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<AddIcon />}
                        className="admin-trucks-assign-btn"
                        onClick={(e) => handleOpenAssignMenu(e, detailTruck)}
                      >
                        Asignar
                      </Button>
                    </div>
                  )}
                </article>
              </div>

              {/* Sección de Trayectos Asignados */}
              <div className="admin-trucks-trayectos-section">
                <div className="admin-trucks-trayectos-header">
                  <div>
                    <h4>
                      Trayectos asignados ({detailTruck.trayectos?.length ?? 0})
                    </h4>
                    <p>Recorridos de recolección vinculados a esta unidad</p>
                  </div>
                </div>

                {detailTruck.trayectos && detailTruck.trayectos.length > 0 ? (
                  <div className="admin-trucks-trayectos-list">
                    {detailTruck.trayectos.map((trayecto) => (
                      <article
                        key={trayecto.id}
                        className="admin-trucks-trayecto-card"
                      >
                        <div
                          className="admin-trucks-trayecto-icon"
                          aria-hidden="true"
                        >
                          <RouteIcon fontSize="small" />
                        </div>
                        <div className="admin-trucks-trayecto-content">
                          <div className="admin-trucks-trayecto-top">
                            <strong className="admin-trucks-trayecto-name">
                              {trayecto.name}
                            </strong>
                            <span className="admin-trucks-trayecto-zone">
                              {trayecto.zone}
                            </span>
                          </div>
                          <p className="admin-trucks-trayecto-desc">
                            {trayecto.description}
                          </p>
                          <div className="admin-trucks-trayecto-meta">
                            <span>{trayecto.activeDays}</span>
                            <span aria-hidden="true">•</span>
                            <span>{trayecto.schedule}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="admin-trucks-trayectos-empty">
                    <RouteIcon className="admin-trucks-trayectos-empty-icon" />
                    <p>Esta unidad no tiene trayectos asignados actualmente.</p>
                  </div>
                )}
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
          <Button
            variant="contained"
            color="success"
            startIcon={<RouteIcon />}
            onClick={() => handleGoToTrayectos(detailTruck ?? undefined)}
          >
            Ir a Trayectos
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Agregar / Editar Camión */}
      <Dialog
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
              helperText={formErrors.code}
              required
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

            <FormControl
              color="success"
              fullWidth
              className={editingTruck ? undefined : 'admin-trucks-form-full'}
            >
              <InputLabel id="truck-driver-select-label">
                Conductor asignado
              </InputLabel>
              <Select
                labelId="truck-driver-select-label"
                id="truck-driver-select"
                label="Conductor asignado"
                value={form.assignedDriver}
                onChange={(e) =>
                  setForm({ ...form, assignedDriver: e.target.value })
                }
              >
                {AVAILABLE_DRIVERS.map((driver) => (
                  <MenuItem key={driver} value={driver}>
                    {driver}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Conductor asignado a la unidad.
              </FormHelperText>
            </FormControl>

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

      {/* Menú para asignar conductor rápidamente */}
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
              minWidth: 240,
              maxWidth: 320,
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
          {targetTruck
            ? `Asignar a ${targetTruck.code}`
            : 'Asignar conductor'}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />

        {systemDrivers.length === 0 ? (
          <MenuItem disabled sx={{ fontSize: '0.82rem', fontStyle: 'italic' }}>
            No hay conductores registrados
          </MenuItem>
        ) : (
          systemDrivers.map((driver) => {
            const isCurrent = targetTruck?.assignedDriver === driver
            return (
              <MenuItem
                key={driver}
                selected={isCurrent}
                onClick={() => handleSelectDriver(driver)}
                sx={{
                  fontSize: '0.82rem',
                  gap: 1,
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                <PersonIcon
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
                  {driver}
                </span>
              </MenuItem>
            )
          })
        )}

        {targetTruck?.assignedDriver &&
          targetTruck.assignedDriver !== 'Sin asignar' && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                onClick={() => handleSelectDriver('Sin asignar')}
                sx={{ fontSize: '0.82rem', color: '#dc2626' }}
              >
                <DeleteOutlineOutlinedIcon
                  fontSize="small"
                  sx={{ mr: 1, color: '#dc2626' }}
                />
                Desvincular conductor
              </MenuItem>
            </>
          )}
      </Menu>
    </section>
  )
}

export default AdminCamiones
