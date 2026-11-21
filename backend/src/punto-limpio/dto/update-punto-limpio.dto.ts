import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PuntoLimpioFieldsDto } from './create-punto-limpio.dto';

export class UpdatePuntoLimpioDto extends PartialType(PuntoLimpioFieldsDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Nuevo frente. El pin se lee desde la dirección vinculada.',
  })
  declare direccionId?: string;
}
