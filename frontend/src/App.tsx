import { useState } from 'react'
import type { NavTab } from './types'
import Header from './components/Header'
import Login from './components/Login'
import { BottomNav } from './components/BottomNav'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('hoy')

  return (
    <div className="app-layout">
      {/* Header oficial con contacto y branding de Trenque Lauquen */}
      <Header />

      {/* Contenido principal con pantalla de Login de la rama auth */}
      <main className="app-main">
        <Login />
      </main>

      {/* Barra de navegación inferior */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
