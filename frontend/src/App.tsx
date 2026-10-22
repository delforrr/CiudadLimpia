import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HoyPage } from './pages/HoyPage';
import { CalendarioPage } from './pages/CalendarioPage';
import { PuntosLimpiosPage } from './pages/PuntosLimpiosPage';
import { PerfilPage } from './pages/PerfilPage';
import './App.css';

function App() {
  return (
    <div className="app-layout">
      {/* Header oficial de Trenque Lauquen */}
      <Header />

      {/* Contenido principal según la ruta */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/puntos-limpios" replace />} />
          <Route path="/hoy" element={<HoyPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/puntos-limpios" element={<PuntosLimpiosPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/registro" element={<PerfilPage initialRegister />} />
          <Route path="*" element={<Navigate to="/hoy" replace />} />
        </Routes>
      </main>

      {/* Barra de navegación inferior */}
      <BottomNav />
    </div>
  );
}

export default App;
