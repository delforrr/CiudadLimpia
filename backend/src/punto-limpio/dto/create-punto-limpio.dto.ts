import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { CreateDireccionDto } from '../../direccion/dto/create-direccion.dto';

export class PuntoLimpioFieldsDto {
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
  @IsUUID('4')
  direccionId!: string;

  @ApiProperty({ example: -35.97, minimum: -90, maximum: 90 })
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -62.73, minimum: -180, maximum: 180 })
  @IsNumber()
  @IsLongitude()
  long!: number;
}

export class CreatePuntoLimpioDto extends OmitType(PuntoLimpioFieldsDto, [
  'direccionId',
] as const) {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Dirección existente. Enviar solo este campo o direccion.',
  })
  @ValidateIf(
    (dto: CreatePuntoLimpioDto) =>
      dto.direccionId !== undefined || dto.direccion === undefined,
  )
  @IsUUID('4')
  direccionId?: string;

  @ApiPropertyOptional({
    type: CreateDireccionDto,
    description: 'Dirección a registrar. Enviar solo este campo o direccionId.',
  })
  @ValidateIf((dto: CreatePuntoLimpioDto) => dto.direccion !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => CreateDireccionDto)
  direccion?: CreateDireccionDto;
}
