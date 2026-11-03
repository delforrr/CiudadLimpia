import { PartialType } from '@nestjs/swagger';
import { CreatePuntoLimpioDto } from './create-punto-limpio.dto';

export class UpdatePuntoLimpioDto extends PartialType(CreatePuntoLimpioDto, {
  skipNullProperties: false,
}) {}
