import { Alert, Button, Checkbox, FormControlLabel, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import camionRecolector from '../assets/camion-recolector.png';
import './Login.css';

export default function Login() {
  const { isAuthenticated, user, onAuthenticated, checking, logout, logoutError, loggingOut } = useAuthContext();
  const navigate = useNavigate();
  const { form, updateField, handleSubmit, error, pending, emailError, passwordError, validateEmail, validatePassword } = useAuthForm((authenticatedUser) => {
    onAuthenticated(authenticatedUser);
    navigate('/hoy');
  });

  if (checking) return <p role="status">Comprobando sesión…</p>;

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
            <p>Sesión activa para <strong>{user?.name}</strong></p>
          </header>

          <div className="perfil-detalles-box">
            <div className="perfil-detalle-item">
              <span className="detalle-label">Correo registrado:</span>
              <span className="detalle-valor">✉️ {user?.email}</span>
            </div>
          </div>

          <div className="perfil-acciones">
            <Button
              type="button"
              className="login-button btn-ir-hoy"
              onClick={() => navigate('/hoy')}
            >
              Ver seguimiento del camión en Hoy →
            </Button>

            {logoutError && <Alert severity="error">{logoutError}</Alert>}
            <Button
              type="button"
              className="btn-cerrar-sesion"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar Sesión'}
            </Button>
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

        <form onSubmit={handleSubmit} className="login-form" aria-busy={pending} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          <div className="form-group">
            <TextField
              label="Correo electrónico"
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              onBlur={validateEmail}
              error={Boolean(emailError)}
              helperText={emailError}
              placeholder="martin@correo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <TextField
              label="Contraseña"
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              onBlur={validatePassword}
              error={Boolean(passwordError)}
              helperText={passwordError}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-options">
            <FormControlLabel
              className="checkbox-label"
              control={<Checkbox checked={form.rememberMe} onChange={(e) => updateField('rememberMe', e.target.checked)} />}
              label="Recordarme"
            />
            <a href="#recuperar" className="login-link">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button type="submit" className="login-button" disabled={pending}>
            {pending ? 'Procesando…' : 'Ingresar'}
          </Button>
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
