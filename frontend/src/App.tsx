import { useState } from 'react';
import type { NavTab } from './types';
import { BottomNav } from './components/BottomNav';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('hoy');

  return (
    <div className="app-layout">
      {/* Todo el contenido fue retirado según lo solicitado */}
      <main className="main-content"></main>

      {/* Navegador inferior */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
