import { PartialType } from '@nestjs/swagger';
import { PuntoLimpioFieldsDto } from './create-punto-limpio.dto';

export class UpdatePuntoLimpioDto extends PartialType(PuntoLimpioFieldsDto, {
  skipNullProperties: false,
}) {}
