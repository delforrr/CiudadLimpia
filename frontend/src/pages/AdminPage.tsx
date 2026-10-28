import { useState } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import iconoCiudadLimpia from '../assets/icono-ciudad-limpia.png';
import { AdminUsuarios } from '../components/AdminUsuarios';
import { AdminChoferes } from '../components/AdminChoferes';
import { useAuthContext } from '../hooks/useAuthContext';
import './AdminPage.css';

type AdminTab = 'dashboard' | 'puntos' | 'recoleccion' | 'choferes' | 'usuarios';

const SECCIONES: Record<AdminTab, { titulo: string; descripcion: string }> = {
  dashboard: {
    titulo: 'Panel de Control',
    descripcion: 'Municipalidad de Trenque Lauquen',
  },
  puntos: {
    titulo: 'Puntos Limpios',
    descripcion: 'Gestión y estado de estaciones de reciclaje',
  },
  recoleccion: {
    titulo: 'Recolección',
    descripcion: 'Cronograma y recorridos de camiones',
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

export function AdminPage() {
  const { user } = useAuthContext();
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
            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="admin-nav-icon"><DashboardIcon fontSize="small" /></span>
              <span>Panel de Control</span>
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
              <span>Recolección</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'choferes' ? 'active' : ''}`}
              onClick={() => setActiveTab('choferes')}
            >
              <span className="admin-nav-icon">
                <span className="admin-nav-chofer-icon" aria-hidden="true" />
              </span>
              <span>Choferes</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('usuarios')}
            >
              <span className="admin-nav-icon"><PeopleIcon fontSize="small" /></span>
              <span>Usuarios</span>
            </button>
          </nav>
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
          ) : (
            /* Contenedor esqueleto del panel */
            <section className="admin-empty-card">
              <div className="admin-empty-content">
                <img
                  src={iconoCiudadLimpia}
                  alt="Ciudad Limpia"
                  className="admin-empty-logo"
                  onError={(e) => {
                    e.currentTarget.src = '/icono-ciudad-limpia.png';
                  }}
                />
                <h3>{seccionActual.titulo}</h3>
                <p>Esqueleto base listo para incorporar los módulos de gestión y control.</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
