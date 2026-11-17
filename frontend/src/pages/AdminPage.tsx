import { useState } from 'react';
import { Alert, ButtonBase, MenuItem, Select } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RouteIcon from '@mui/icons-material/Route';
import PeopleIcon from '@mui/icons-material/People';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import iconoCiudadLimpia from '../assets/icono-ciudad-limpia.png';
import { AdminUsuarios } from '../components/AdminUsuarios';
import { AdminChoferes } from '../components/AdminChoferes';
import { AdminCamiones } from '../components/AdminCamiones';
import { AdminPuntosLimpios } from '../components/AdminPuntosLimpios';
import { AdminTiposPuntosLimpios } from '../components/AdminTiposPuntosLimpios';
import { AdminTrayectos } from '../components/AdminTrayectos';
import { useAuthContext } from '../hooks/useAuthContext';
import { useAdminTrayectos } from '../hooks/useAdminTrayectos';
import './AdminPage.css';
import './AdminModules.css';

type AdminTab = 'dashboard' | 'puntos' | 'tipos' | 'recoleccion' | 'camiones' | 'choferes' | 'usuarios';

const SECCIONES: Record<AdminTab, { titulo: string; descripcion: string }> = {
  dashboard: {
    titulo: 'Panel de Control',
    descripcion: 'Municipalidad de Trenque Lauquen',
  },
  puntos: {
    titulo: 'Puntos Limpios',
    descripcion: 'Gestión y estado de estaciones de reciclaje',
  },
  tipos: {
    titulo: 'Tipos de Puntos Limpios',
    descripcion: 'Categorías disponibles y los materiales que recibe cada una',
  },
  recoleccion: {
    titulo: 'Trayectos de recolección',
    descripcion: 'Recorridos de recolección domiciliaria',
  },
  camiones: {
    titulo: 'Camiones',
    descripcion: 'Gestión del parque automotor y unidades de recolección',
  },
  choferes: {
    titulo: 'Choferes',
    descripcion: 'Personal de recolección y asignación de unidades',
  },
  usuarios: {
    titulo: 'Usuarios',
    descripcion: 'Padrón de vecinos registrados en la plataforma',
  },
};

const NAVEGACION = [
  { id: 'dashboard', nombre: 'Panel de Control', icono: DashboardIcon },
  { id: 'puntos', nombre: 'Puntos Limpios', icono: LocationOnIcon },
  { id: 'tipos', nombre: 'Tipos de Puntos', icono: CategoryIcon },
  { id: 'recoleccion', nombre: 'Trayectos', icono: RouteIcon },
  { id: 'camiones', nombre: 'Camiones', icono: LocalShippingIcon },
  { id: 'choferes', nombre: 'Choferes', icono: PeopleIcon },
  { id: 'usuarios', nombre: 'Usuarios', icono: PeopleIcon },
] as const;

export function AdminPage() {
  const { user } = useAuthContext();
  const trayectos = useAdminTrayectos(user?.role === 'ADMIN');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const adminName = user?.cliente
    ? `${user.cliente.name} ${user.cliente.lastName}`
    : (user?.email ?? 'Administrador');
  const adminInitials = user?.cliente?.name ? user.cliente.name.charAt(0).toUpperCase() : 'A';
  const seccionActual = SECCIONES[activeTab];

  return (
    <div className="admin-wrapper">
      {/* Barra Lateral / Sidebar Desktop en verde #013A27 */}
      <aside className="admin-sidebar">
        <div>
          <div className="admin-sidebar-header">
            <div className="admin-brand">
              <img
                src={iconoCiudadLimpia}
                alt="Logo Ciudad Limpia"
                className="admin-brand-img"
                onError={(e) => {
                  e.currentTarget.src = '/icono-ciudad-limpia.png';
                }}
              />
              <div className="admin-brand-text">
                <h1>
                  <span className="brand-ciudad">Ciudad</span>{' '}
                  <span className="brand-limpia">Limpia</span>
                </h1>
                <span className="admin-badge">Panel de Control</span>
              </div>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Navegación del panel">
            {NAVEGACION.map(({ id, nombre, icono: Icono }) => (
              <ButtonBase key={id} className={`admin-nav-item${activeTab === id ? ' active' : ''}`}
                aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>
                <span className="admin-nav-icon">
                  {id === 'choferes' ? <span className="admin-nav-chofer-icon" aria-hidden="true" /> : <Icono fontSize="small" />}
                </span>
                <span>{nombre}</span>
              </ButtonBase>
            ))}
          </nav>

          <div className="admin-nav-movil">
            <img src={iconoCiudadLimpia} alt="Ciudad Limpia" />
            <Select size="small" value={activeTab}
              inputProps={{ 'aria-label': 'Sección del panel' }}
              onChange={(event) => setActiveTab(event.target.value as AdminTab)}>
              {NAVEGACION.map(({ id, nombre }) => <MenuItem key={id} value={id}>{nombre}</MenuItem>)}
            </Select>
          </div>
        </div>

        {/* Footer del sidebar con usuario */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-avatar">{adminInitials}</div>
            <div className="admin-user-info">
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-role">{user?.role ?? 'ADMIN'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="admin-main-content">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <h2>{seccionActual.titulo}</h2>
            <p>{seccionActual.descripcion}</p>
          </div>
        </header>

        <div className="admin-body">
          {activeTab === 'usuarios' ? (
            <AdminUsuarios />
          ) : activeTab === 'choferes' ? (
            <AdminChoferes />
          ) : activeTab === 'camiones' ? (
            <AdminCamiones
              trayectosDisponibles={trayectos.trayectos} localidades={trayectos.localidades}
              cargandoTrayectos={user?.role === 'ADMIN' && trayectos.cargando}
              errorTrayectos={trayectos.error} recargarTrayectos={trayectos.cargar} />
          ) : activeTab === 'puntos' ? (
            <AdminPuntosLimpios />
          ) : activeTab === 'tipos' ? (
            <AdminTiposPuntosLimpios />
          ) : activeTab === 'recoleccion' ? (
            user?.role === 'ADMIN' ? <AdminTrayectos admin={trayectos} /> : <Alert severity="warning">Iniciá sesión como administrador para gestionar trayectos.</Alert>
          ) : (
            <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
              <h3 id="admin-dashboard-title">Accesos directos</h3>
              <div className="admin-dashboard-grid">
                {NAVEGACION.filter(({ id }) => id !== 'dashboard').map(({ id, nombre, icono: Icono }) => (
                  <ButtonBase key={id} className="admin-dashboard-card" onClick={() => setActiveTab(id)}>
                    <span className="admin-dashboard-icono">
                      {id === 'choferes' ? <span className="admin-nav-chofer-icon" aria-hidden="true" /> : <Icono />}
                    </span>
                    <span className="admin-dashboard-texto">
                      <strong>{nombre}</strong>
                      <span>{SECCIONES[id].descripcion}</span>
                    </span>
                    <ArrowForwardIcon className="admin-dashboard-flecha" fontSize="small" />
                  </ButtonBase>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
