import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { useDomicilios } from '../hooks/useDomicilios';
import camionRecolector from '../assets/camion-recolector.png';
import './Login.css';

interface LoginProps {
  initialRegister?: boolean;
}

export default function Login({ initialRegister = false }: LoginProps) {
  const { isAuthenticated, user, onAuthenticated, checking, logout, logoutError, loggingOut } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isRegisterPath = location.pathname === '/registro';

  const {
    form,
    register,
    updateField,
    handleSubmit,
    error,
    pending,
    nameError,
    lastNameError,
    emailError,
    passwordError,
    repeatedPasswordError,
    validateName,
    validateLastName,
    validateEmail,
    validatePassword,
    validateRepeatedPassword,
    toggleMode,
    setMode,
  } = useAuthForm((authenticatedUser) => {
    onAuthenticated(authenticatedUser);
    navigate('/hoy');
  }, initialRegister || isRegisterPath);

  // Hook de gestión de domicilios del usuario
  const {
    domicilios,
    agregarDomicilio,
    eliminarDomicilio,
    hacerPrincipal,
  } = useDomicilios(user?.id);

  // Estados de edición de datos personales
  const [editando, setEditando] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [apellidoEdit, setApellidoEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [mensajeExito, setMensajeExito] = useState(false);

  // Estados para agregar un nuevo domicilio
  const [mostrandoAgregarDomicilio, setMostrandoAgregarDomicilio] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [nuevoEsPrincipal, setNuevoEsPrincipal] = useState(false);
  const [errorDomicilio, setErrorDomicilio] = useState('');

  useEffect(() => {
    if (location.pathname === '/registro' && !register) {
      setMode(true);
    } else if (location.pathname === '/perfil' && register && !initialRegister) {
      setMode(false);
    }
  }, [location.pathname, register, initialRegister, setMode]);

  const handleToggleMode = () => {
    const nextRegister = !register;
    toggleMode();
    navigate(nextRegister ? '/registro' : '/perfil');
  };

  if (checking) return <p role="status">Comprobando sesión…</p>;

  const handleIniciarEdicion = () => {
    setNombreEdit(user?.name || '');
    setApellidoEdit(user?.lastName || '');
    setEmailEdit(user?.email || '');
    setEditando(true);
    setMensajeExito(false);
  };

  const handleGuardarCambios = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user) {
      const updatedUser = {
        ...user,
        name: nombreEdit.trim() || user.name,
        lastName: apellidoEdit.trim() || user.lastName,
        email: emailEdit.trim() || user.email,
      };
      onAuthenticated(updatedUser);
    }
    setEditando(false);
    setMensajeExito(true);
  };

  const handleCancelarEdicion = () => {
    setEditando(false);
    if (user) {
      setNombreEdit(user.name || '');
      setApellidoEdit(user.lastName || '');
      setEmailEdit(user.email || '');
    }
  };

  const handleGuardarNuevoDomicilio = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nuevaDireccion.trim()) {
      setErrorDomicilio('Ingresá una dirección');
      return;
    }
    const ok = agregarDomicilio(nuevaDireccion, nuevaEtiqueta, nuevoEsPrincipal);
    if (ok) {
      setNuevaDireccion('');
      setNuevaEtiqueta('');
      setNuevoEsPrincipal(false);
      setMostrandoAgregarDomicilio(false);
      setErrorDomicilio('');
      setMensajeExito(true);
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
                ? 'Actualizá tu información personal'
                : <>Sesión activa para <strong>{user?.name} {user?.lastName}</strong></>}
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
                <label htmlFor="perfil-apellido">Apellido</label>
                <input
                  id="perfil-apellido"
                  type="text"
                  value={apellidoEdit}
                  onChange={(e) => setApellidoEdit(e.target.value)}
                  placeholder="Tu apellido"
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
                    <span className="detalle-valor">{user?.name} {user?.lastName}</span>
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

                {/* Sección de domicilios vinculados */}
                <div className="perfil-domicilios-box">
                  <div className="perfil-domicilios-header">
                    <span className="detalle-label">Mis Domicilios</span>
                    {!mostrandoAgregarDomicilio && (
                      <button
                        type="button"
                        className="btn-link-agregar-domicilio"
                        onClick={() => {
                          setMostrandoAgregarDomicilio(true);
                          setMensajeExito(false);
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Agregar domicilio</span>
                      </button>
                    )}
                  </div>

                  {domicilios.length === 0 && !mostrandoAgregarDomicilio ? (
                    <div className="domicilio-vacio-box">
                      <div className="domicilio-vacio-row">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#68A544"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="domicilio-vacio-texto">Sin dirección vinculada</span>
                      </div>
                      <p className="domicilio-vacio-desc">
                        Podés agregar tu dirección desde cero para consultar el recolector en tu cuadra.
                      </p>
                      <button
                        type="button"
                        className="btn-agregar-primer-domicilio"
                        onClick={() => {
                          setMostrandoAgregarDomicilio(true);
                          setMensajeExito(false);
                        }}
                      >
                        + Agregar domicilio desde cero
                      </button>
                    </div>
                  ) : (
                    <div className="domicilios-lista">
                      {domicilios.map((dom) => (
                        <div
                          key={dom.id}
                          className={`domicilio-card-item ${dom.esPrincipal ? 'es-principal' : ''}`}
                        >
                          <div className="domicilio-item-main">
                            <div className="domicilio-pin-icon" aria-hidden="true">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#1E6000"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                            </div>
                            <div className="domicilio-item-datos">
                              <div className="domicilio-item-top">
                                <span className="domicilio-item-direccion">{dom.direccion}</span>
                                {dom.esPrincipal && (
                                  <span className="badge-domicilio-principal">Principal</span>
                                )}
                              </div>
                              {dom.etiqueta && (
                                <span className="domicilio-item-etiqueta">{dom.etiqueta}</span>
                              )}
                            </div>
                          </div>

                          <div className="domicilio-item-acciones">
                            {!dom.esPrincipal && (
                              <button
                                type="button"
                                className="btn-hacer-principal"
                                onClick={() => hacerPrincipal(dom.id)}
                              >
                                Usar como principal
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-eliminar-domicilio"
                              onClick={() => eliminarDomicilio(dom.id)}
                              title="Eliminar este domicilio"
                              aria-label={`Eliminar domicilio ${dom.direccion}`}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {mostrandoAgregarDomicilio && (
                    <form onSubmit={handleGuardarNuevoDomicilio} className="form-agregar-domicilio">
                      <div className="form-group">
                        <label htmlFor="nuevo-domicilio-dir">Dirección</label>
                        <input
                          id="nuevo-domicilio-dir"
                          type="text"
                          value={nuevaDireccion}
                          onChange={(e) => setNuevaDireccion(e.target.value)}
                          placeholder="Calle y número · Barrio (ej. Villegas 450)"
                          required
                          autoFocus
                        />
                        {errorDomicilio && <span className="field-error-text">{errorDomicilio}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="nuevo-domicilio-etiqueta">Etiqueta (opcional)</label>
                        <input
                          id="nuevo-domicilio-etiqueta"
                          type="text"
                          value={nuevaEtiqueta}
                          onChange={(e) => setNuevaEtiqueta(e.target.value)}
                          placeholder="Ej. Casa, Trabajo, Local"
                        />
                      </div>

                      {domicilios.length > 0 && (
                        <label className="checkbox-label domicilio-checkbox-principal">
                          <input
                            type="checkbox"
                            checked={nuevoEsPrincipal}
                            onChange={(e) => setNuevoEsPrincipal(e.target.checked)}
                          />
                          Marcar como domicilio principal
                        </label>
                      )}

                      <div className="form-domicilio-botones">
                        <button type="submit" className="login-button btn-guardar-domicilio">
                          Guardar domicilio
                        </button>
                        <button
                          type="button"
                          className="btn-cancelar-edicion"
                          onClick={() => {
                            setMostrandoAgregarDomicilio(false);
                            setNuevaDireccion('');
                            setNuevaEtiqueta('');
                            setErrorDomicilio('');
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
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

                {logoutError && <Alert severity="error">{logoutError}</Alert>}

                <button
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
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Si no inició sesión, mostrar formulario de login o registro
  return (
    <div className="login-container">
      <div className="login-card">
        <header className="login-header">
          <div className="login-title-row">
            <h2>{register ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
            <img
              src={camionRecolector}
              alt="Camión recolector"
              className="login-truck-icon"
            />
          </div>
          <p>
            {register
              ? 'Completá tus datos para ver el recolector en tu cuadra'
              : 'Ingresá tus credenciales para ver el recolector en tu cuadra'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="login-form" aria-busy={pending} noValidate>
          {error && <Alert severity="error">{error}</Alert>}

          {register && (
            <>
              <div className="form-group">
                <label htmlFor="name">Nombre</label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  onBlur={validateName}
                  placeholder="Ej. Ana María"
                  autoComplete="given-name"
                  required
                  className={nameError ? 'input-error' : ''}
                />
                {nameError && <span className="field-error-text">{nameError}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Apellido</label>
                <input
                  id="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  onBlur={validateLastName}
                  placeholder="Ej. Pérez"
                  autoComplete="family-name"
                  required
                  className={lastNameError ? 'input-error' : ''}
                />
                {lastNameError && <span className="field-error-text">{lastNameError}</span>}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              onBlur={validateEmail}
              placeholder="ana@correo.com"
              autoComplete="email"
              required
              className={emailError ? 'input-error' : ''}
            />
            {emailError && <span className="field-error-text">{emailError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              onBlur={validatePassword}
              placeholder="••••••••"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              className={passwordError ? 'input-error' : ''}
            />
            {passwordError && <span className="field-error-text">{passwordError}</span>}
          </div>

          {register ? (
            <div className="form-group">
              <label htmlFor="repeatedPassword">Repetir contraseña</label>
              <input
                id="repeatedPassword"
                type="password"
                value={form.repeatedPassword}
                onChange={(e) => updateField('repeatedPassword', e.target.value)}
                onBlur={validateRepeatedPassword}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className={repeatedPasswordError ? 'input-error' : ''}
              />
              {repeatedPasswordError && (
                <span className="field-error-text">{repeatedPasswordError}</span>
              )}
            </div>
          ) : (
            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => updateField('rememberMe', e.target.checked)}
                />
                Recordarme
              </label>
              <a href="#recuperar" className="login-link">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          <button type="submit" className="login-button" disabled={pending}>
            {pending
              ? register
                ? 'Registrando…'
                : 'Procesando…'
              : register
                ? 'Registrarse'
                : 'Ingresar'}
          </button>
        </form>

        <footer className="login-footer">
          {register ? (
            <>
              <span>¿Ya tenés una cuenta? </span>
              <button
                type="button"
                className="login-link-btn"
                onClick={handleToggleMode}
              >
                Iniciá sesión
              </button>
            </>
          ) : (
            <>
              <span>¿No tenés una cuenta? </span>
              <button
                type="button"
                className="login-link-btn"
                onClick={handleToggleMode}
              >
                Regístrate
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
