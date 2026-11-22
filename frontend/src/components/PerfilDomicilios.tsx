import type { User } from '../services/authService';
import { capitalizarInicial } from '../utils/capitalizarInicial';
import PerfilDomiciliosDesplegable from './PerfilDomiciliosDesplegable';

type PerfilDomiciliosProps = {
  domicilios: NonNullable<User['cliente']>['domicilios'];
};

export default function PerfilDomicilios({ domicilios }: PerfilDomiciliosProps) {
  return (
    <PerfilDomiciliosDesplegable>
      <div className="perfil-domicilios-lista">
        {domicilios.map((domicilio) => (
          <div className="domicilio-item" key={domicilio.id}>
            <span className="detalle-valor">{capitalizarInicial(domicilio.direccion)}</span>
            {domicilio.etiqueta && <span className="domicilio-etiqueta">{capitalizarInicial(domicilio.etiqueta)}</span>}
          </div>
        ))}
        {domicilios.length === 0 && <p>No tenés domicilios registrados.</p>}
      </div>
    </PerfilDomiciliosDesplegable>
  );
}
