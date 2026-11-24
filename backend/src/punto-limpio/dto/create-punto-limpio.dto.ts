import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  CoordenadasDireccionDto,
  FrenteDireccionDto,
} from '../../direccion/dto/create-direccion.dto';
import { Estado } from '../../generated/prisma/enums';

export class PuntoLimpioFieldsDto extends PartialType(CoordenadasDireccionDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({ enum: Estado, default: Estado.ACTIVO })
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(Estado)
  estado?: Estado;

  @ApiProperty({ example: 'Parque Villegas', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4')
  tipoId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000002',
  })
  @IsUUID()
  direccionId!: string;
}

export class CreatePuntoLimpioDto extends OmitType(PuntoLimpioFieldsDto, [
  'direccionId',
] as const) {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Dirección existente. Excluyente con direccion. Si enviás coordenadas, deben coincidir con el pin guardado.',
  })
  @ValidateIf(
    (dto: CreatePuntoLimpioDto) =>
      dto.direccionId !== undefined || dto.direccion === undefined,
  )
  @IsUUID()
  direccionId?: string;

  @ApiPropertyOptional({
    type: FrenteDireccionDto,
    description: 'Frente a resolver. Requiere lat y long a nivel del punto.',
  })
  @ValidateIf((dto: CreatePuntoLimpioDto) => dto.direccion !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => FrenteDireccionDto)
  direccion?: FrenteDireccionDto;
}
