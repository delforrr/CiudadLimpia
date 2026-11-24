import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header';
import { BottomNav } from './components/BottomNav';
import ProfileGate from './components/ProfileGate';
import './App.css';

const Hoy = lazy(() => import('./components/HoyCards').then(({ HoyCards }) => ({ default: HoyCards })));
const PuntosLimpios = lazy(() => import('./components/PuntosLimpios').then((modulo) => ({
  default: modulo.PuntosLimpios,
})));
const Calendario = lazy(() => import('./pages/CalendarioPage'));
const Perfil = lazy(() => import('./pages/PerfilPage'));
const Admin = lazy(() => import('./pages/AdminPage'));

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <ProfileGate>
        <Suspense fallback={<p role="status">Cargando administración…</p>}>
          <Routes>
            <Route path="/admin/*" element={<Admin />} />
          </Routes>
        </Suspense>
      </ProfileGate>
    );
  }

  return (
    <div className="app-layout">
      {/* Header oficial de Trenque Lauquen */}
      <Header />

      {/* Contenido principal según la ruta */}
      <main className="app-main">
        <ProfileGate>
          <Suspense fallback={<p role="status">Cargando pantalla…</p>}>
            <Routes>
              <Route path="/" element={<Navigate to="/puntos-limpios" replace />} />
              <Route path="/hoy" element={<Hoy />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/puntos-limpios" element={<PuntosLimpios />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/registro" element={<Perfil initialRegister />} />
              <Route path="*" element={<Navigate to="/hoy" replace />} />
            </Routes>
          </Suspense>
        </ProfileGate>
      </main>

      {/* Barra de navegación inferior */}
      <BottomNav />
    </div>
  );
}

export default App;
