import React from 'react';
import type { NavTab } from '../types';
import { TruckIcon, CalendarIcon, RecyclingSymbol, ProfileIcon } from './Icons';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface TabItem {
  id: NavTab;
  label: string;
  renderIcon: (color: string) => React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: TabItem[] = [
    {
      id: 'hoy',
      label: 'Hoy',
      renderIcon: (color) => <TruckIcon size={25} color={color} />,
    },
    {
      id: 'calendario',
      label: 'Calendario',
      renderIcon: (color) => <CalendarIcon size={24} color={color} />,
    },
    {
      id: 'puntos-limpios',
      label: 'Puntos Limpios',
      renderIcon: (color) => <RecyclingSymbol size={24} color={color} />,
    },
    {
      id: 'perfil',
      label: 'Mi Perfil',
      renderIcon: (color) => <ProfileIcon size={24} color={color} />,
    },
  ];

  return (
    <nav className="bottom-nav-container" aria-label="Navegación principal">
      <div className="bottom-nav">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? '#156538' : '#607284';

          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
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
