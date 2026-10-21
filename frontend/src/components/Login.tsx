import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import camionRecolector from '../assets/camion-recolector.png';
import './Login.css';

export default function Login() {
  const { isAuthenticated, user, login, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Estados del formulario de inicio de sesión
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(false);

  // Estados de edición de datos de perfil
  const [editando, setEditando] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [direccionEdit, setDireccionEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [mensajeExito, setMensajeExito] = useState(false);

  // Sincronizar datos iniciales cuando el usuario está disponible
  useEffect(() => {
    if (user) {
      setNombreEdit(user.nombre || '');
      setDireccionEdit(user.direccion || '');
      setEmailEdit(user.email || '');
    }
  }, [user]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Guardar en sesión
    login({
      email: email || 'martin@trenquelauquen.gov.ar',
      nombre: email ? email.split('@')[0] : 'Martín',
      direccion: 'Av. Las Palmas 450 · Barrio Los Olivos',
      barrio: 'Barrio Los Olivos',
    });
    // Redirigir a Hoy donde la tarjeta ya estará activa
    navigate('/hoy');
  };

  const handleIniciarEdicion = () => {
    setNombreEdit(user?.nombre || '');
    setDireccionEdit(user?.direccion || '');
    setEmailEdit(user?.email || '');
    setEditando(true);
    setMensajeExito(false);
  };

  const handleGuardarCambios = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateUser({
      nombre: nombreEdit.trim() || user?.nombre || 'Martín',
      direccion: direccionEdit.trim() || user?.direccion || 'Av. Las Palmas 450 · Barrio Los Olivos',
      email: emailEdit.trim() || user?.email || 'martin@trenquelauquen.gov.ar',
    });
    setEditando(false);
    setMensajeExito(true);
  };

  const handleCancelarEdicion = () => {
    setEditando(false);
    if (user) {
      setNombreEdit(user.nombre || '');
      setDireccionEdit(user.direccion || '');
      setEmailEdit(user.email || '');
    }
  };

  // Si ya tiene sesión iniciada, mostrar su perfil o formulario de edición
  if (isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card perfil-card-activo">
          <header className="login-header">
            <div className="perfil-avatar-circle" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1E6000"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2>{editando ? 'Editar mis datos' : 'Mi Perfil'}</h2>
            <p>
              {editando
                ? 'Actualizá tu información personal y domicilio'
                : <>Sesión activa para <strong>{user?.nombre}</strong></>}
            </p>
          </header>

          {mensajeExito && !editando && (
            <div className="perfil-alerta-exito" role="status">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1E6000"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Tus datos se actualizaron correctamente.</span>
            </div>
          )}

          {editando ? (
            <form onSubmit={handleGuardarCambios} className="perfil-edit-form">
              <div className="form-group">
                <label htmlFor="perfil-nombre">Nombre</label>
                <input
                  id="perfil-nombre"
                  type="text"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="perfil-direccion">Dirección vinculada</label>
                <input
                  id="perfil-direccion"
                  type="text"
                  value={direccionEdit}
                  onChange={(e) => setDireccionEdit(e.target.value)}
                  placeholder="Calle y número · Barrio"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="perfil-email">Correo electrónico</label>
                <input
                  id="perfil-email"
                  type="email"
                  value={emailEdit}
                  onChange={(e) => setEmailEdit(e.target.value)}
                  placeholder="correo@trenquelauquen.gov.ar"
                  required
                />
              </div>

              <div className="perfil-edit-acciones">
                <button type="submit" className="login-button btn-guardar-perfil">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Guardar cambios</span>
                </button>

                <button
                  type="button"
                  className="btn-cancelar-edicion"
                  onClick={handleCancelarEdicion}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="perfil-detalles-box">
                <div className="perfil-detalle-item">
                  <span className="detalle-label">Nombre</span>
                  <div className="detalle-valor-row">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1E6000"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="detalle-valor">{user?.nombre}</span>
                  </div>
                </div>

                <div className="perfil-detalle-item">
                  <span className="detalle-label">Dirección vinculada</span>
                  <div className="detalle-valor-row">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1E6000"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="detalle-valor">{user?.direccion}</span>
                  </div>
                </div>

                <div className="perfil-detalle-item">
                  <span className="detalle-label">Correo registrado</span>
                  <div className="detalle-valor-row">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1E6000"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span className="detalle-valor">{user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="perfil-acciones">
                <button
                  type="button"
                  className="btn-editar-perfil"
                  onClick={handleIniciarEdicion}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Editar mis datos</span>
                </button>

                <button
                  type="button"
                  className="btn-cerrar-sesion"
                  onClick={logout}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Si no inició sesión, mostrar formulario de login
  return (
    <div className="login-container">
      <div className="login-card">
        <header className="login-header">
          <div className="login-title-row">
            <h2>Iniciar Sesión</h2>
            <img
              src={camionRecolector}
              alt="Camión recolector"
              className="login-truck-icon"
            />
          </div>
          <p>Ingresá tus credenciales para ver el recolector en tu cuadra</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="martin@correo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
              Recordarme
            </label>
            <a href="#recuperar" className="login-link">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button type="submit" className="login-button">
            Ingresar
          </button>
        </form>

        <footer className="login-footer">
          <span>¿No tienes una cuenta? </span>
          <a href="#registro" className="login-link">
            Regístrate
          </a>
        </footer>
      </div>
    </div>
  );
}
