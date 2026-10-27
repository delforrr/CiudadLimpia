import React from 'react';
import Login from '../components/Login';

interface PerfilPageProps {
  initialRegister?: boolean;
}

export const PerfilPage: React.FC<PerfilPageProps> = ({ initialRegister = false }) => {
  return <Login key={initialRegister ? 'registro' : 'login'} initialRegister={initialRegister} />;
};

export default PerfilPage;
