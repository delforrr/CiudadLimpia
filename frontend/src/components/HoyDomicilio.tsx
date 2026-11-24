import { useId, useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';
import { useDomicilioActual } from '../hooks/useDomicilioActual';
import { capitalizarInicial } from '../utils/capitalizarInicial';
import './DomiciliosCard.css';

export default function HoyDomicilio({ actual, domicilios, elegir, guardando }: ReturnType<typeof useDomicilioActual>) {
  const buttonId = useId();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button disabled={guardando} id={buttonId} className="direccion-header" startIcon={<PlaceIcon className="icono-pin" />}
        endIcon={<ExpandMoreIcon />} aria-haspopup="menu" aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined} onClick={(event) => setAnchor(event.currentTarget)}>
        {actual ? capitalizarInicial(actual.direccion) : 'Elegir domicilio'}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        slotProps={{
          paper: { className: 'direccion-menu' },
          list: { id: menuId, 'aria-labelledby': buttonId, className: 'direccion-menu-lista' },
        }}>
        {domicilios.map((domicilio) => {
          const { id, direccion, etiqueta } = domicilio;
          const seleccionada = id === actual?.id;
          return (
            <MenuItem key={id} className="direccion-opcion" selected={seleccionada} role="menuitemradio"
              aria-checked={seleccionada} onClick={() => {
                void elegir(domicilio);
                setAnchor(null);
              }}>
              <span>{capitalizarInicial(direccion)}</span>
              {etiqueta && <span className="direccion-etiqueta">{capitalizarInicial(etiqueta)}</span>}
            </MenuItem>
          );
        })}
        <MenuItem className="domicilio-agregar direccion-agregar" component={Link}
          to="/perfil?nuevoDomicilio=1" disabled={domicilios.length >= 20}>
          Agregar domicilio
        </MenuItem>
      </Menu>
    </>
  );
}
