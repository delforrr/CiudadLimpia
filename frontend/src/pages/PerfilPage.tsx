import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import Login from '../components/Login';

interface PerfilPageProps {
  initialRegister?: boolean;
}

export const PerfilPage: React.FC<PerfilPageProps> = ({ initialRegister = false }) => {
  const [params] = useSearchParams();
  const { user } = useAuthContext();
  const nuevoDomicilio = !initialRegister && Boolean(user) && params.get('nuevoDomicilio') === '1';

  return <Login key={nuevoDomicilio ? `domicilio-${user?.id}` : initialRegister ? 'registro' : 'login'}
    initialRegister={initialRegister} nuevoDomicilioInicial={nuevoDomicilio} />;
};

export default PerfilPage;
