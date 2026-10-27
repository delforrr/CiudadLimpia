import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import iconoCiudadLimpia from '../assets/icono-ciudad-limpia.png';
import { useAuthContext } from '../hooks/useAuthContext';
import './AdminPage.css';

type AdminTab = 'dashboard' | 'puntos' | 'recoleccion' | 'usuarios';

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const adminName = user?.cliente
    ? `${user.cliente.name} ${user.cliente.lastName}`
    : (user?.email ?? 'Administrador');
  const adminInitials = user?.cliente?.name ? user.cliente.name.charAt(0).toUpperCase() : 'A';

  return (
    <div className="admin-wrapper">
      {/* Barra Lateral / Sidebar Desktop */}
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
              className={`admin-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('usuarios')}
            >
              <span className="admin-nav-icon"><PeopleIcon fontSize="small" /></span>
              <span>Usuarios</span>
            </button>
          </nav>
        </div>

        {/* Footer del sidebar con usuario y botón para volver */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-avatar">{adminInitials}</div>
            <div className="admin-user-info">
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-role">{user?.role ?? 'ADMIN'}</span>
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

      {/* Área Principal (Esqueleto limpio) */}
      <main className="admin-main-content">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <h2>Panel de Control</h2>
            <p>Municipalidad de Trenque Lauquen</p>
          </div>

          <div className="admin-topbar-actions">
            <div className="admin-status-chip">
              <span className="status-dot" />
              <span>Conectado</span>
            </div>

            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/hoy')}
              sx={{
                borderColor: '#cbd5e1',
                color: '#1E6000',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                borderRadius: '6px',
                '&:hover': {
                  borderColor: '#68A544',
                  backgroundColor: '#f0f7ed',
                },
              }}
            >
              Ir a la web
            </Button>
          </div>
        </header>

        <div className="admin-body">
          {/* Contenedor esqueleto del panel */}
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
              <h3>Panel de Administración</h3>
              <p>Esqueleto base listo para incorporar los módulos de gestión y control.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
