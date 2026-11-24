import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TruckIcon, CalendarIcon, PuntosLimpiosIcon, ProfileIcon } from './Icons';

interface TabItem {
  label: string;
  path: string;
  renderIcon: (color: string) => React.ReactNode;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs: TabItem[] = [
    {
      label: 'Hoy',
      path: '/hoy',
      renderIcon: (color) => <TruckIcon size={28} color={color} />,
    },
    {
      label: 'Calendario',
      path: '/calendario',
      renderIcon: (color) => <CalendarIcon size={24} color={color} />,
    },
    {
      label: 'Puntos Limpios',
      path: '/puntos-limpios',
      renderIcon: (color) => <PuntosLimpiosIcon size={25} color={color} />,
    },
    {
      label: 'Mi Perfil',
      path: '/perfil',
      renderIcon: (color) => <ProfileIcon size={24} color={color} />,
    },
  ];

  return (
    <nav className="bottom-nav-container" aria-label="Navegación principal">
      <div className="bottom-nav">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path ||
            (tab.path === '/puntos-limpios' && location.pathname === '/') ||
            (tab.path === '/perfil' && location.pathname === '/registro');

          const color = isActive ? '#68A245' : 'rgba(255, 255, 255, 0.65)';

          return (
            <button
              key={tab.path}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-selected={isActive}
              role="tab"
            >
              <div className="nav-icon-wrapper">
                {tab.renderIcon(color)}
              </div>
              <span className="nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
