import { useId, type ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import './PerfilDomicilios.css';

type PerfilDomiciliosDesplegableProps = {
  children: ReactNode;
  title?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export default function PerfilDomiciliosDesplegable({
  children, title = 'Mis domicilios', expanded, onExpandedChange,
}: PerfilDomiciliosDesplegableProps) {
  const id = useId();

  return (
    <section className="perfil-domicilios-box" aria-label={title}>
      <Accordion className="perfil-domicilios-desplegable" disableGutters elevation={0}
        expanded={expanded} onChange={(_, open) => onExpandedChange?.(open)}
        slotProps={{ transition: { unmountOnExit: true } }}>
        <AccordionSummary className="perfil-domicilios-resumen" expandIcon={<ExpandMoreIcon />}
          id={`${id}-resumen`} aria-controls={`${id}-contenido`}>
          <span className="perfil-domicilios-titulo">
            <HomeOutlinedIcon fontSize="small" aria-hidden="true" />
            {title}
          </span>
        </AccordionSummary>
        <AccordionDetails className="perfil-domicilios-contenido">
          {children}
        </AccordionDetails>
      </Accordion>
    </section>
  );
}
