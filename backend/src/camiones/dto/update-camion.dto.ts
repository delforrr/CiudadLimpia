import { PartialType } from '@nestjs/swagger';
import { CreateCamionDto } from './create-camion.dto';

export class UpdateCamionDto extends PartialType(CreateCamionDto, {
  skipNullProperties: false,
}) {}
