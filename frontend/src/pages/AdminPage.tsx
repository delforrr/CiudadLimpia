import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  TextField,
  Chip,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuthContext } from '../hooks/useAuthContext';
import './AdminPage.css';

type AdminTab = 'dashboard' | 'puntos' | 'recoleccion' | 'usuarios' | 'reportes';

interface PuntoItem {
  id: string;
  nombre: string;
  zona: string;
  tipo: string;
  estado: 'Operativo' | 'Mantenimiento' | 'Requiere vaciado';
  ultimaRecoleccion: string;
}

const PUNTOS_EJEMPLO: PuntoItem[] = [
  {
    id: 'PL-01',
    nombre: 'Punto Limpio Plaza San Martín',
    zona: 'Centro',
    tipo: 'Reciclables / Plásticos / Vidrio',
    estado: 'Operativo',
    ultimaRecoleccion: 'Hoy 08:30 hs',
  },
  {
    id: 'PL-02',
    nombre: 'Punto Limpio Parque Villegas',
    zona: 'Oeste',
    tipo: 'Electrónicos / Pilas',
    estado: 'Operativo',
    ultimaRecoleccion: 'Ayer 15:45 hs',
  },
  {
    id: 'PL-03',
    nombre: 'Estación Bulevar Villegas y Uruguay',
    zona: 'Norte',
    tipo: 'Cartón / Papel / Metales',
    estado: 'Requiere vaciado',
    ultimaRecoleccion: 'Hace 2 días',
  },
  {
    id: 'PL-04',
    nombre: 'Punto Limpio Acceso Rodríguez Mera',
    zona: 'Sur',
    tipo: 'Orgánicos y Compost',
    estado: 'Mantenimiento',
    ultimaRecoleccion: '24/10/2026',
  },
];

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const adminName = user?.cliente ? `${user.cliente.name} ${user.cliente.lastName}` : (user?.email ?? 'Administrador Municipal');
  const adminInitials = user?.cliente?.name ? user.cliente.name.charAt(0).toUpperCase() : 'A';

  const puntosFiltrados = PUNTOS_EJEMPLO.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.zona.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-wrapper">
      {/* Barra Lateral / Sidebar (Orientado a Desktop) */}
      <aside className="admin-sidebar">
        <div>
          <div className="admin-sidebar-header">
            <div className="admin-brand">
              <div className="admin-brand-icon">CL</div>
              <div className="admin-brand-text">
                <h1>Ciudad Limpia</h1>
                <span className="admin-badge">Panel de Control</span>
              </div>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Navegación del panel de administración">
            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="admin-nav-icon"><DashboardIcon fontSize="small" /></span>
              <span>Visión General</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'puntos' ? 'active' : ''}`}
              onClick={() => setActiveTab('puntos')}
            >
              <span className="admin-nav-icon"><LocationOnIcon fontSize="small" /></span>
              <span>Puntos Limpios</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'recoleccion' ? 'active' : ''}`}
              onClick={() => setActiveTab('recoleccion')}
            >
              <span className="admin-nav-icon"><LocalShippingIcon fontSize="small" /></span>
              <span>Rutas y Recolección</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('usuarios')}
            >
              <span className="admin-nav-icon"><PeopleIcon fontSize="small" /></span>
              <span>Usuarios y Vecinos</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'reportes' ? 'active' : ''}`}
              onClick={() => setActiveTab('reportes')}
            >
              <span className="admin-nav-icon"><AssessmentIcon fontSize="small" /></span>
              <span>Reportes y Métricas</span>
            </button>
          </nav>
        </div>

        {/* Footer del sidebar con info de sesión y volver */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-avatar">{adminInitials}</div>
            <div className="admin-user-info">
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-role">Rol: {user?.role ?? 'ADMIN'}</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-back-btn"
            onClick={() => navigate('/hoy')}
            title="Volver a la vista del ciudadano"
          >
            <ArrowBackIcon fontSize="small" />
            <span>Volver a la app</span>
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="admin-main-content">
        {/* Topbar del Administrador */}
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <h2>Gestión Municipal de Residuos</h2>
            <p>Trenque Lauquen — Monitoreo de servicios y puntos verdes en tiempo real</p>
          </div>

          <div className="admin-topbar-actions">
            <div className="admin-status-chip">
              <span className="status-dot" />
              <span>Servicio en línea</span>
            </div>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: '#1E6000',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                '&:hover': {
                  backgroundColor: '#164800',
                },
              }}
            >
              Nuevo Punto / Alerta
            </Button>
          </div>
        </header>

        {/* Cuerpo del Panel */}
        <div className="admin-body">
          {/* Métricas / KPIs Principales */}
          <section className="admin-kpis-grid" aria-label="Métricas clave">
            <div className="admin-kpi-card">
              <div className="admin-kpi-info">
                <h3>Puntos Operativos</h3>
                <p className="admin-kpi-value">18 / 20</p>
                <p className="admin-kpi-sub">90% disponibilidad</p>
              </div>
              <div className="admin-kpi-icon-wrap">
                <LocationOnIcon fontSize="medium" />
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-info">
                <h3>Rutas Activas Hoy</h3>
                <p className="admin-kpi-value">6</p>
                <p className="admin-kpi-sub">Orgánicos y Reciclables</p>
              </div>
              <div className="admin-kpi-icon-wrap">
                <LocalShippingIcon fontSize="medium" />
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-info">
                <h3>Reclamos Pendientes</h3>
                <p className="admin-kpi-value">3</p>
                <p className="admin-kpi-sub" style={{ color: '#d97706' }}>1 requiere vaciado urgente</p>
              </div>
              <div className="admin-kpi-icon-wrap" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                <WarningAmberIcon fontSize="medium" />
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-info">
                <h3>Vecinos Registrados</h3>
                <p className="admin-kpi-value">1.428</p>
                <p className="admin-kpi-sub">+14 esta semana</p>
              </div>
              <div className="admin-kpi-icon-wrap">
                <PeopleIcon fontSize="medium" />
              </div>
            </div>
          </section>

          {/* Secciones en Cuadrícula (Tabla de puntos y avisos del sistema) */}
          <div className="admin-sections-grid">
            {/* Tabla de monitoreo de puntos limpios */}
            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>Estado de Puntos Limpios</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Control de capacidad y frecuencia de recolección
                  </span>
                </div>

                <TextField
                  size="small"
                  placeholder="Buscar por zona o tipo…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    width: '260px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      '&.Mui-focused fieldset': {
                        borderColor: '#68A544',
                      },
                    },
                  }}
                />
              </div>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                <Table size="medium">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Punto Limpio</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Zona</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Tipo Residuo</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Última Recolección</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {puntosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                          No se encontraron puntos con ese criterio.
                        </TableCell>
                      </TableRow>
                    ) : (
                      puntosFiltrados.map((punto) => (
                        <TableRow key={punto.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>
                            {punto.nombre}
                          </TableCell>
                          <TableCell sx={{ color: '#475569', fontSize: '0.84rem' }}>{punto.zona}</TableCell>
                          <TableCell sx={{ color: '#475569', fontSize: '0.84rem' }}>{punto.tipo}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={punto.estado}
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.74rem',
                                backgroundColor:
                                  punto.estado === 'Operativo'
                                    ? '#ecfdf5'
                                    : punto.estado === 'Mantenimiento'
                                    ? '#f1f5f9'
                                    : '#fef2f2',
                                color:
                                  punto.estado === 'Operativo'
                                    ? '#065f46'
                                    : punto.estado === 'Mantenimiento'
                                    ? '#475569'
                                    : '#b91c1c',
                                border: `1px solid ${
                                  punto.estado === 'Operativo'
                                    ? '#a7f3d0'
                                    : punto.estado === 'Mantenimiento'
                                    ? '#cbd5e1'
                                    : '#fecaca'
                                }`,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#64748b', fontSize: '0.84rem' }}>
                            {punto.ultimaRecoleccion}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" aria-label="Opciones de punto" sx={{ color: '#94a3b8' }}>
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </section>

            {/* Avisos y Actividad Reciente */}
            <section className="admin-card">
              <div className="admin-card-header">
                <h3>Avisos del Servicio</h3>
                <IconButton size="small" sx={{ color: '#1E6000' }} aria-label="Notificaciones">
                  <NotificationsIcon fontSize="small" />
                </IconButton>
              </div>

              <div className="admin-list">
                <div className="admin-list-item">
                  <CheckCircleOutlineIcon fontSize="small" className="admin-list-icon" />
                  <div className="admin-list-content">
                    <h4>Ruta Nocturna Centro finalizada</h4>
                    <p>Camión 02 completó el vaciado en contenedores de reciclables.</p>
                  </div>
                </div>

                <div className="admin-list-item">
                  <WarningAmberIcon fontSize="small" sx={{ color: '#d97706', mt: '2px' }} />
                  <div className="admin-list-content">
                    <h4>Punto Limpio Bulevar Villegas</h4>
                    <p>Sensor de nivel detectó contenedor de cartón al 92% de capacidad.</p>
                  </div>
                </div>

                <div className="admin-list-item">
                  <CheckCircleOutlineIcon fontSize="small" className="admin-list-icon" />
                  <div className="admin-list-content">
                    <h4>Actualización de cronograma</h4>
                    <p>Se cargó el calendario especial para el próximo feriado municipal.</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#cbd5e1',
                    color: '#1E6000',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    '&:hover': {
                      borderColor: '#68A544',
                      backgroundColor: '#f0f7ed',
                    },
                  }}
                  onClick={() => setActiveTab('reportes')}
                >
                  Ver todos los registros
                </Button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
export default AdminPage;
