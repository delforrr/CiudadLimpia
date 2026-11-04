import { PartialType } from '@nestjs/swagger';
import { CreateTipoPuntoLimpioDto } from './create-tipo-punto-limpio.dto';

export class UpdateTipoPuntoLimpioDto extends PartialType(
  CreateTipoPuntoLimpioDto,
  {
    skipNullProperties: false,
  },
) {}
