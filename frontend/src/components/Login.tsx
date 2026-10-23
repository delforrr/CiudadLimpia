import { Alert, Button, Checkbox, FormControlLabel, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { useProfileForm } from '../hooks/useProfileForm';
import camionRecolector from '../assets/camion-recolector.png';
import './Login.css';

export default function Login() {
  const { isAuthenticated, user, onAuthenticated, checking, logout, logoutError, loggingOut } = useAuthContext();
  const navigate = useNavigate();
  const { form, register, toggleMode, updateField, handleSubmit, error, pending, emailError, passwordError, fieldErrors, validateEmail, validatePassword } = useAuthForm((authenticatedUser) => {
    onAuthenticated(authenticatedUser);
    navigate('/hoy');
  });

  const {
    editando, form: profile, updateField: updateProfileField, mensajeExito,
    error: profileError, pending: savingProfile, fieldErrors: profileFieldErrors,
    iniciarEdicion: handleIniciarEdicion, guardar: handleGuardarCambios,
    cancelar: handleCancelarEdicion,
  } = useProfileForm(user, onAuthenticated);

  if (checking) return <p role="status">Comprobando sesión…</p>;

  // Si ya tiene sesión iniciada, mostrar su perfil o formulario de edición
  if (isAuthenticated) {
    const needsAddress = !user?.cliente?.domicilios.length;
    const direccionActual = user?.cliente?.domicilios.map(({ direccion }) => direccion).join(' · ') || 'Sin domicilio registrado';

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
                : <>Sesión activa para <strong>{user?.cliente ? `${user.cliente.name} ${user.cliente.lastName}` : user?.email}</strong></>}
            </p>
          </header>

          {needsAddress && (
            <Alert severity="warning">Completá al menos un domicilio para continuar usando la aplicación.</Alert>
          )}

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
            <form onSubmit={handleGuardarCambios} className="perfil-edit-form" aria-busy={savingProfile} noValidate>
              {profileError && <Alert severity="error">{profileError}</Alert>}
              <div className="form-group">
                <TextField
                  fullWidth
                  label="Nombre"
                  autoComplete="given-name"
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  id="perfil-nombre"
                  disabled={savingProfile}
                  error={Boolean(profileFieldErrors.name)}
                  helperText={profileFieldErrors.name?.[0]}
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfileField('name', e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div className="form-group">
                <TextField
                  fullWidth
                  label="Apellido"
                  autoComplete="family-name"
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  id="perfil-apellido"
                  disabled={savingProfile}
                  error={Boolean(profileFieldErrors.lastName)}
                  helperText={profileFieldErrors.lastName?.[0]}
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => updateProfileField('lastName', e.target.value)}
                  placeholder="Tu apellido"
                  required
                />
              </div>

              <div className="form-group">
                <TextField
                  fullWidth
                  label="Domicilios"
                  id="perfil-direccion"
                  disabled={savingProfile}
                  error={Boolean(profileFieldErrors.direccion)}
                  multiline
                  minRows={2}
                  required
                  helperText={profileFieldErrors.direccion?.[0] ?? "Una dirección por línea. Al menos una y hasta 20; máximo 200 caracteres por dirección."}
                  value={profile.direccion}
                  onChange={(e) => updateProfileField('direccion', e.target.value)}
                  placeholder="Calle y número · Barrio"
                />
              </div>

              <div className="form-group">
                <TextField
                  fullWidth
                  label="Correo electrónico"
                  autoComplete="email"
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                  id="perfil-email"
                  disabled={savingProfile}
                  error={Boolean(profileFieldErrors.email)}
                  helperText={profileFieldErrors.email?.[0]}
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateProfileField('email', e.target.value)}
                  placeholder="correo@trenquelauquen.gov.ar"
                  required
                />
              </div>

              <div className="perfil-edit-acciones">
                <Button type="submit" className="login-button btn-guardar-perfil" disabled={savingProfile}>
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
                  <span>{savingProfile ? 'Guardando…' : 'Guardar cambios'}</span>
                </Button>

                <Button
                  type="button"
                  className="btn-cancelar-edicion"
                  onClick={handleCancelarEdicion}
                  disabled={savingProfile}
                >
                  Cancelar
                </Button>
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
                    <span className="detalle-valor">{user?.cliente ? `${user.cliente.name} ${user.cliente.lastName}` : 'Sin cliente asociado'}</span>
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
                    <span className="detalle-valor">{direccionActual}</span>
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
                <Button
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
                  <span>{needsAddress ? 'Completar mis datos' : 'Editar mis datos'}</span>
                </Button>

                {logoutError && <Alert severity="error">{logoutError}</Alert>}

                <Button
                  type="button"
                  className="btn-cerrar-sesion"
                  onClick={logout}
                  disabled={loggingOut}
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
                  <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar Sesión'}</span>
                </Button>
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
            <h2>{register ? 'Crear cuenta' : 'Iniciar Sesión'}</h2>
            <img
              src={camionRecolector}
              alt="Camión recolector"
              className="login-truck-icon"
            />
          </div>
          <p>{register ? 'Completá tus datos y al menos un domicilio' : 'Ingresá tus credenciales para ver el recolector en tu cuadra'}</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form" aria-busy={pending} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          {register && (
            <>
              <TextField
                label="Nombre" autoComplete="given-name" required fullWidth
                value={form.name} disabled={pending}
                onChange={(e) => updateField('name', e.target.value)}
                error={Boolean(fieldErrors.name)} helperText={fieldErrors.name?.[0]}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                label="Apellido" autoComplete="family-name" required fullWidth
                value={form.lastName} disabled={pending}
                onChange={(e) => updateField('lastName', e.target.value)}
                error={Boolean(fieldErrors.lastName)} helperText={fieldErrors.lastName?.[0]}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                label="Domicilios" required fullWidth multiline minRows={2}
                placeholder="San Martín 123" value={form.direccion} disabled={pending}
                onChange={(e) => updateField('direccion', e.target.value)}
                error={Boolean(fieldErrors.direccion)}
                helperText={fieldErrors.direccion?.[0] ?? 'Una dirección por línea. Entre 1 y 20; hasta 200 caracteres cada una.'}
              />
            </>
          )}
          <TextField
            id="email" label="Correo electrónico" type="email" autoComplete="email"
            required fullWidth value={form.email} disabled={pending}
            onChange={(e) => updateField('email', e.target.value)} onBlur={validateEmail}
            error={Boolean(emailError)} helperText={emailError}
            slotProps={{ htmlInput: { maxLength: 254 } }}
          />
          <TextField
            id="password" label="Contraseña" type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required fullWidth value={form.password} disabled={pending}
            onChange={(e) => updateField('password', e.target.value)} onBlur={validatePassword}
            error={Boolean(passwordError)}
            helperText={passwordError || (register ? 'Al menos 8 caracteres; hasta 72 bytes.' : '')}
          />
          {register ? (
            <TextField
              label="Repetir contraseña" type="password" autoComplete="new-password"
              required fullWidth value={form.repeatedPassword} disabled={pending}
              onChange={(e) => updateField('repeatedPassword', e.target.value)}
              error={Boolean(fieldErrors.repeatedPassword)} helperText={fieldErrors.repeatedPassword?.[0]}
            />
          ) : (
            <FormControlLabel label="Recordarme" control={
              <Checkbox checked={form.rememberMe} disabled={pending}
                onChange={(e) => updateField('rememberMe', e.target.checked)} />
            } />
          )}

          <Button type="submit" className="login-button" disabled={pending}>
            {pending ? 'Procesando…' : register ? 'Crear cuenta' : 'Ingresar'}
          </Button>
        </form>

        <footer className="login-footer">
          <span>{register ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}</span>
          <Button type="button" onClick={toggleMode} disabled={pending}>
            {register ? 'Iniciar sesión' : 'Registrate'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
