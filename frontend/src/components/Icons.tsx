import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Truck icon matching the "Hoy" icon from the reference image
export const TruckIcon: React.FC<IconProps> = ({ size = 26, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block' }}
  >
    {/* Truck cargo body */}
    <path
      d="M2 5.5C2 4.67 2.67 4 3.5 4H14.5C15.33 4 16 4.67 16 5.5V14.5C16 15.33 15.33 16 14.5 16H2V5.5Z"
      fill={color}
    />
    {/* Truck cabin */}
    <path
      d="M16 8H18.8C19.33 8 19.82 8.28 20.1 8.73L21.8 11.45C21.93 11.66 22 11.91 22 12.16V14.5C22 15.33 21.33 16 20.5 16H16V8Z"
      fill={color}
    />
    {/* Cabin window cut */}
    <path
      d="M16.5 9.2H18.3C18.6 9.2 18.85 9.38 19 9.62L19.9 11.2H16.5V9.2Z"
      fill="#ffffff"
      opacity="0.9"
    />
    {/* Left wheel */}
    <circle cx="6" cy="17" r="2.5" fill={color} />
    <circle cx="6" cy="17" r="1.1" fill="#ffffff" />
    {/* Right wheel */}
    <circle cx="17.5" cy="17" r="2.5" fill={color} />
    <circle cx="17.5" cy="17" r="1.1" fill="#ffffff" />
  </svg>
);

// Calendar icon matching the "Calendario" icon from the reference image
export const CalendarIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block' }}
  >
    {/* Calendar body outline */}
    <rect
      x="3.5"
      y="5"
      width="17"
      height="15"
      rx="2.5"
      stroke={color}
      strokeWidth="2"
    />
    {/* Top binder rings */}
    <line x1="7.5" y1="2.5" x2="7.5" y2="5.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="16.5" y1="2.5" x2="16.5" y2="5.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Top header dividing line */}
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke={color} strokeWidth="1.8" />
    {/* Grid dots/squares inside */}
    <rect x="7" y="12" width="2" height="2" rx="0.5" fill={color} />
    <rect x="11" y="12" width="2" height="2" rx="0.5" fill={color} />
    <rect x="15" y="12" width="2" height="2" rx="0.5" fill={color} />
    <rect x="7" y="15.5" width="2" height="2" rx="0.5" fill={color} />
    <rect x="11" y="15.5" width="2" height="2" rx="0.5" fill={color} />
    <rect x="15" y="15.5" width="2" height="2" rx="0.5" fill={color} />
  </svg>
);

// Recycle icon matching "Puntos Limpios"
export const RecycleIcon: React.FC<IconProps> = ({ size = 25, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block' }}
  >
    <path d="M4.5 10.5L2 7H6.5C7.33 7 8 7.67 8 8.5V9.5H6.5V8.5H3.8L5.3 10.5H4.5ZM12 4.2L9.2 8.5H7.3L11.1 2.5C11.5 1.8 12.5 1.8 12.9 2.5L16.7 8.5H14.8L12 4.2ZM19.5 10.5H18.7L20.2 8.5H17.5V9.5H16V8.5C16 7.67 16.67 7 17.5 7H22L19.5 10.5ZM17 14V12.5H18.5V14C18.5 14.83 17.83 15.5 17 15.5H15.8L17.8 19H16L14 15.5H17V14ZM9.7 19L11.7 15.5H8.2C7.37 15.5 6.7 14.83 6.7 14V12.5H8.2V14H10.1L8.1 17.5H9.7ZM12 18.2L14.3 22H9.7L12 18.2Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2a1 1 0 0 1 .86.49l3.5 6A1 1 0 0 1 15.5 10H14v-.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V10H8.5a1 1 0 0 1-.86-1.51l3.5-6A1 1 0 0 1 12 2Zm-6.5 9a1 1 0 0 1 .5.13l5.2 3a1 1 0 0 1 .5.87v2a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5V15a1 1 0 0 1 1.5-.87l2 1.15a1 1 0 0 1 .5.87V19a3 3 0 0 1-3 3h-6a3 3 0 0 1-2.6-1.5l-2.6-4.5A1 1 0 0 1 5.5 11Z"
      opacity="0.2"
    />
  </svg>
);

// Better high-fidelity 3-arrow recycle icon
export const RecyclingSymbol: React.FC<IconProps> = ({ size = 25, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block' }}
  >
    <path d="M11.16 2.45a1 1 0 0 1 1.68 0l3.75 5.5a1 1 0 0 1-.84 1.55H13v2.5a1 1 0 0 1-2 0V9.5H8.25a1 1 0 0 1-.84-1.55l3.75-5.5Zm-4.9 8.28a1 1 0 0 1 1.45-.84l6.2 3.1a1 1 0 0 1 .1 1.76l-2.17 1.25 1.25 2.17a1 1 0 0 1-1.73 1l-1.25-2.17-2.17 1.25a1 1 0 0 1-1.45-.84l-.23-6.68Zm11.48.01a1 1 0 0 1-.23 6.68l-2.17-1.25-1.25 2.17a1 1 0 0 1-1.73-1l1.25-2.17-2.17-1.25a1 1 0 0 1 .1-1.76l6.2-3.1a1 1 0 0 1 1.45.84l-.23-.16v.85Z" />
  </svg>
);

// Profile icon matching "Mi Perfil"
export const ProfileIcon: React.FC<IconProps> = ({ size = 25, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block' }}
  >
    {/* Head circle */}
    <circle
      cx="12"
      cy="7.5"
      r="4"
      stroke={color}
      strokeWidth="2"
    />
    {/* Torso/Shoulders arch */}
    <path
      d="M4.5 19.5C4.5 15.63 7.86 12.5 12 12.5C16.14 12.5 19.5 15.63 19.5 19.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Additional helpful icons for UI
export const CheckCircleIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="8" />
    <line x1="12" y1="12" x2="12" y2="16" />
  </svg>
);

export const ZoomInIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16" y2="16" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
