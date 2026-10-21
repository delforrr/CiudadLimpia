import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { NavTab } from '../types';
import { TruckIcon, CalendarIcon, PuntosLimpiosIcon, ProfileIcon } from './Icons';

interface BottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}

interface TabItem {
  id: NavTab;
  label: string;
  path: string;
  renderIcon: (color: string) => React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab: propActiveTab, onTabChange }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs: TabItem[] = [
    {
      id: 'hoy',
      label: 'Hoy',
      path: '/hoy',
      renderIcon: (color) => <TruckIcon size={28} color={color} />,
    },
    {
      id: 'calendario',
      label: 'Calendario',
      path: '/calendario',
      renderIcon: (color) => <CalendarIcon size={24} color={color} />,
    },
    {
      id: 'puntos-limpios',
      label: 'Puntos Limpios',
      path: '/puntos-limpios',
      renderIcon: (color) => <PuntosLimpiosIcon size={25} color={color} />,
    },
    {
      id: 'perfil',
      label: 'Mi Perfil',
      path: '/perfil',
      renderIcon: (color) => <ProfileIcon size={24} color={color} />,
    },
  ];

  const handleTabClick = (tab: TabItem) => {
    if (onTabChange) {
      onTabChange(tab.id);
    }
    navigate(tab.path);
  };

  return (
    <nav className="bottom-nav-container" aria-label="Navegación principal">
      <div className="bottom-nav">
        {tabs.map((tab) => {
          // Determinar si está activo por la ruta actual de React Router
          const isActive =
            propActiveTab !== undefined
              ? propActiveTab === tab.id
              : location.pathname === tab.path ||
                (tab.path === '/hoy' && location.pathname === '/');

          const color = isActive ? '#68A245' : 'rgba(255, 255, 255, 0.65)';

          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
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
};
