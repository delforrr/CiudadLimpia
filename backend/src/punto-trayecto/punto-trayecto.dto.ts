import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CoordenadasDireccionDto,
  FrenteDireccionDto,
} from '../direccion/dto/create-direccion.dto';
import { DireccionResponseDto } from '../direccion/dto/direccion-response.dto';

export class CreatePuntoTrayectoDto extends PartialType(
  CoordenadasDireccionDto,
  {
    skipNullProperties: false,
  },
) {
  @ApiProperty({
    minimum: 0,
    description: 'Posición en el recorrido desde cero.',
  })
  @IsInt()
  @Min(0)
  orden!: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Dirección existente. Excluyente con direccion. Si enviás coordenadas, deben coincidir con el pin guardado.',
  })
  @ValidateIf(
    (punto: CreatePuntoTrayectoDto) => punto.direccionId !== undefined,
  )
  @IsUUID()
  direccionId?: string;

  @ApiPropertyOptional({
    type: FrenteDireccionDto,
    description: 'Frente a resolver. Requiere lat y long a nivel del punto.',
  })
  @ValidateIf((punto: CreatePuntoTrayectoDto) => punto.direccion !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => FrenteDireccionDto)
  direccion?: FrenteDireccionDto;
}

export class PuntoTrayectoResponseDto extends CoordenadasDireccionDto {
  @ApiProperty({ minimum: 0 })
  orden!: number;

  @ApiProperty({ format: 'uuid' })
  direccionId!: string;

  @ApiProperty({ type: DireccionResponseDto })
  direccion!: DireccionResponseDto;
}
