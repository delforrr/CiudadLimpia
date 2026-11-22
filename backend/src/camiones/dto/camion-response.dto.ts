import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Estado } from '../../generated/prisma/enums';
import { CreateCamionDto } from './create-camion.dto';

export class CamionResponseDto extends OmitType(CreateCamionDto, ['estado']) {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: Estado, enumName: 'Estado' })
  estado!: Estado;
}
