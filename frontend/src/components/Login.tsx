import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { useProfileForm } from '../hooks/useProfileForm';
import { capitalizarInicial } from '../utils/capitalizarInicial';
import DomiciliosCard from './DomiciliosCard';
import PerfilDomicilios from './PerfilDomicilios';
import PerfilNuevoDomicilio from './PerfilNuevoDomicilio';
import camionRecolector from '../assets/camion-recolector.png';
import './Login.css';

export default function Login({
  initialRegister = false, nuevoDomicilioInicial = false,
}: { initialRegister?: boolean; nuevoDomicilioInicial?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatedPassword, setShowRepeatedPassword] = useState(false);
  const { isAuthenticated, user, onAuthenticated, checking, logout, logoutError, loggingOut } = useAuthContext();
  const navigate = useNavigate();
  const { form, register, updateField, handleSubmit, error, pending, fieldErrors, validateField } = useAuthForm((authenticatedUser) => {
    onAuthenticated(authenticatedUser);
    navigate('/hoy', { replace: true });
  }, initialRegister);

  const {
    editando, form: profile, updateField: updateProfileField, mensajeExito,
    error: profileError, pending: savingProfile, fieldErrors: profileFieldErrors,
    iniciarEdicion: handleIniciarEdicion, guardar: handleGuardarCambios,
    cancelar: handleCancelarEdicion,
    domiciliosExpandidos, setDomiciliosExpandidos,
    domicilioAEliminar, solicitarEliminarDomicilio, cancelarEliminarDomicilio,
    confirmarEliminarDomicilio,
    domicilioNuevo, erroresDomicilioNuevo, iniciarDomicilioNuevo,
    actualizarDomicilioNuevo, agregarDomicilioNuevo, cancelarDomicilioNuevo,
  } = useProfileForm(user, onAuthenticated, nuevoDomicilioInicial);

  if (checking) return <p role="status">Comprobando sesión…</p>;

  // Si ya tiene sesión iniciada, mostrar su perfil o formulario de edición
  if (isAuthenticated) {
    const needsAddress = !user?.cliente?.domicilios.length;
    const nombreCompleto = user?.cliente
      ? `${capitalizarInicial(user.cliente.name)} ${capitalizarInicial(user.cliente.lastName)}`
      : null;

    return (
      <div className="login-container">
        <div className={`login-card perfil-card-activo${editando ? ' perfil-card-editando' : ''}`}>
          <header className="login-header">
            <div className="perfil-avatar-circle" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2>{domicilioNuevo ? 'Nuevo domicilio' : editando ? 'Editar mis datos' : 'Mi Perfil'}</h2>
            {!editando && <p>Sesión activa para <strong>{nombreCompleto ?? user?.email}</strong></p>}
          </header>

          {needsAddress && !domicilioNuevo && (
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

          {domicilioNuevo ? (
            <PerfilNuevoDomicilio
              domicilio={domicilioNuevo}
              errores={erroresDomicilioNuevo}
              onChange={actualizarDomicilioNuevo}
              onSubmit={agregarDomicilioNuevo}
              onCancel={cancelarDomicilioNuevo}
            />
          ) : editando ? (
            <form onSubmit={handleGuardarCambios} className="perfil-edit-form" aria-busy={savingProfile} noValidate>
              {profileError && <Alert severity="error">{profileError}</Alert>}
              <div className="perfil-edit-nombres">
                <TextField
                  fullWidth
                  size="small"
                  color="success"
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
                <TextField
                  fullWidth
                  size="small"
                  color="success"
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
                  size="small"
                  color="success"
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

              <DomiciliosCard domicilios={profile.domicilios} readOnly onAgregar={iniciarDomicilioNuevo}
                expanded={domiciliosExpandidos} onExpandedChange={setDomiciliosExpandidos}
                onChange={(domicilios) => updateProfileField('domicilios', domicilios)}
                onEliminar={solicitarEliminarDomicilio}
                disabled={savingProfile} errors={profileFieldErrors.domicilios} />

              <Dialog open={Boolean(domicilioAEliminar)} onClose={cancelarEliminarDomicilio}
                fullWidth maxWidth="xs" aria-labelledby="perfil-eliminar-domicilio-titulo"
                aria-describedby="perfil-eliminar-domicilio-pregunta">
                <DialogTitle id="perfil-eliminar-domicilio-titulo">Eliminar domicilio</DialogTitle>
                <DialogContent>
                  <DialogContentText id="perfil-eliminar-domicilio-pregunta">
                    ¿Seguro que querés eliminar {domicilioAEliminar?.direccion || 'este domicilio'}?
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button type="button" autoFocus color="inherit" onClick={cancelarEliminarDomicilio}>
                    Cancelar
                  </Button>
                  <Button type="button" color="error" variant="contained" onClick={confirmarEliminarDomicilio}>
                    Eliminar
                  </Button>
                </DialogActions>
              </Dialog>

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
                    <span className="detalle-valor">{nombreCompleto ?? 'Sin cliente asociado'}</span>
                  </div>
                </div>

                <PerfilDomicilios domicilios={user?.cliente?.domicilios ?? []} />

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
                  onClick={() => handleIniciarEdicion()}
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
      <div className={`login-card ${register ? 'register-card' : ''}`}>
        <header className="login-header">
          <div className="login-title-row">
            <h2>{register ? 'Crear cuenta' : 'Iniciar Sesión'}</h2>
            <img
              src={camionRecolector}
              alt="Camión recolector"
              className="login-truck-icon"
            />
          </div>
          <p>{register ? 'Completá tus datos para crear tu cuenta' : 'Ingresá tus credenciales para ver el recolector en tu cuadra'}</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form" aria-busy={pending} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          {register && (
            <>
              <TextField
                id="name" name="name" type="text"
                label="Nombre" autoComplete="given-name" required fullWidth size="small"
                value={form.name} disabled={pending}
                onChange={(e) => updateField('name', e.target.value)}
                onBlur={() => validateField('name')}
                error={Boolean(fieldErrors.name)} helperText={fieldErrors.name?.[0]}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                id="lastName" name="lastName" type="text"
                label="Apellido" autoComplete="family-name" required fullWidth size="small"
                value={form.lastName} disabled={pending}
                onChange={(e) => updateField('lastName', e.target.value)}
                onBlur={() => validateField('lastName')}
                error={Boolean(fieldErrors.lastName)} helperText={fieldErrors.lastName?.[0]}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </>
          )}
          <TextField
            id="email" label="Correo electrónico" type="email" autoComplete="email"
            required fullWidth size={register ? 'small' : undefined} value={form.email} disabled={pending}
            onChange={(e) => updateField('email', e.target.value)} onBlur={() => validateField('email')}
            error={Boolean(fieldErrors.email)} helperText={fieldErrors.email?.[0]}
            slotProps={{ htmlInput: { maxLength: 254 } }}
          />
          <TextField
            id="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            fullWidth
            size={register ? 'small' : undefined}
            value={form.password}
            disabled={pending}
            onChange={(e) => updateField('password', e.target.value)}
            onBlur={() => validateField('password')}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password?.[0]}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      disabled={pending}
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {register ? (
            <TextField
              id="repeatedPassword"
              name="repeatedPassword"
              label="Repetir contraseña"
              type={showRepeatedPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              fullWidth
              size="small"
              value={form.repeatedPassword}
              disabled={pending}
              onChange={(e) => updateField('repeatedPassword', e.target.value)}
              onBlur={() => validateField('repeatedPassword')}
              error={Boolean(fieldErrors.repeatedPassword)}
              helperText={fieldErrors.repeatedPassword?.[0]}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showRepeatedPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        onClick={() => setShowRepeatedPassword((prev) => !prev)}
                        edge="end"
                        disabled={pending}
                        size="small"
                      >
                        {showRepeatedPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
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
          <Button
            type="button"
            className="login-toggle-button"
            onClick={() => navigate(register ? '/perfil' : '/registro')}
            disabled={pending}
          >
            {register ? 'Iniciar sesión' : 'Registrate'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
