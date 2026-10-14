import { useState } from 'react'
import type { NavTab } from './types'
import Header from './components/Header'
import { BottomNav } from './components/BottomNav'
import { HoyCards } from './components/HoyCards'
import fotoCalendario from './assets/calendario-recoleccion.jpg'
import videoPoloAmbiental from './assets/Polo-ambiental-recoleccion-de-residuos.mp4'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('hoy')

  return (
    <div className="app-layout">
      {/* Header oficial de Trenque Lauquen */}
      <Header />

      {/* Contenido principal según el apartado activo */}
      <main className="app-main">
        {activeTab === 'hoy' && <HoyCards />}

        {activeTab === 'calendario' && (
          <div className="calendario-container">
            <img
              src={fotoCalendario}
              alt="Sistema de Recolección de Residuos - Trenque Lauquen"
              className="calendario-img"
            />
            <video
              src={videoPoloAmbiental}
              className="calendario-video"
              controls
              playsInline
              preload="metadata"
            >
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>
        )}
      </main>

      {/* Barra de navegación inferior */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
