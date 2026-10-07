import logoMunicipalidad from '../assets/logo-trenquelauquen.png'
import './Header.css'

export default function Header() {
  return (
    <header className="site-header">
      {/* Barra superior de contacto verde */}
      <div className="top-bar">
        <div className="header-inner top-bar-content">
          <a href="tel:02392410501" className="top-bar-item">
            <svg
              className="top-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20a1 1 0 01-1 1c-9.39 0-17-7.61-17-17a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58.11.35.03.74-.25 1.02l-2.2 2.19z" />
            </svg>
            <span>(02392) 410501/05</span>
          </a>

          <a
            href="mailto:municipalidad@trenquelauquen.gov.ar"
            className="top-bar-item"
          >
            <svg
              className="top-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>municipalidad@trenquelauquen.gov.ar</span>
          </a>
        </div>
      </div>

      {/* Barra principal con logo y acciones */}
      <div className="main-nav">
        <div className="header-inner main-nav-content">
          <a href="/" className="logo-link" aria-label="Inicio">
            <img
              src={logoMunicipalidad}
              alt="Municipalidad de Trenque Lauquen - Lugar del Encuentro"
              className="header-logo"
            />
          </a>
        </div>
      </div>

      {/* Línea de borde inferior de color #1E6000 */}
      <div className="header-bottom-border" />
    </header>
  )
}
