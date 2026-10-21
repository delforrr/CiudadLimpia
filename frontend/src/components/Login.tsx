import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import camionRecolector from '../assets/camion-recolector.png';
import './Login.css';

export default function Login() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(false);

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

  // Si ya tiene sesión iniciada, mostrar su perfil
  if (isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card perfil-card-activo">
          <header className="login-header">
            <div className="perfil-avatar-circle">
              👤
            </div>
            <h2>Mi Perfil</h2>
            <p>Sesión activa para <strong>{user?.nombre}</strong></p>
          </header>

          <div className="perfil-detalles-box">
            <div className="perfil-detalle-item">
              <span className="detalle-label">Dirección vinculada:</span>
              <span className="detalle-valor">📍 {user?.direccion}</span>
            </div>
            <div className="perfil-detalle-item">
              <span className="detalle-label">Correo registrado:</span>
              <span className="detalle-valor">✉️ {user?.email}</span>
            </div>
          </div>

          <div className="perfil-acciones">
            <button
              type="button"
              className="login-button btn-ir-hoy"
              onClick={() => navigate('/hoy')}
            >
              Ver seguimiento del camión en Hoy →
            </button>

            <button
              type="button"
              className="btn-cerrar-sesion"
              onClick={logout}
            >
              Cerrar Sesión
            </button>
          </div>
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
