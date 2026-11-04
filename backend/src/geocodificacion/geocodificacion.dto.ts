import { ApiProperty, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';
import { CreateDireccionDto } from '../direccion/dto/create-direccion.dto';

function numeroDecimal({ value }: { value: unknown }): unknown {
  return typeof value === 'string' && /^[+-]?\d+(\.\d+)?$/.test(value)
    ? Number(value)
    : value;
}

export class GeocodificacionDirectaQuery extends PickType(CreateDireccionDto, [
  'calle',
  'altura',
] as const) {
  @Transform(numeroDecimal)
  declare altura: number;
}

export class GeocodificacionInversaQuery {
  @ApiProperty({ example: -35.97, minimum: -90, maximum: 90 })
  @Transform(numeroDecimal)
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -62.73, minimum: -180, maximum: 180 })
  @Transform(numeroDecimal)
  @IsNumber()
  @IsLongitude()
  long!: number;
}

export const GEOREF_FUENTE = 'Servicio Georef – argentina.gob.ar/georef';

class DireccionSugeridaDto {
  @ApiProperty({ example: 'VILLEGAS' })
  calle!: string;

  @ApiProperty({ type: Number, nullable: true, example: 555 })
  altura!: number | null;
}

class UbicacionSugeridaDto extends GeocodificacionInversaQuery {
  @ApiProperty({ example: 'VILLEGAS' })
  calle!: string;

  @ApiProperty({ example: 555 })
  altura!: number;
}

export class GeocodificacionDirectaResponse {
  @ApiProperty({ type: [UbicacionSugeridaDto], maxItems: 3 })
  sugerencias!: UbicacionSugeridaDto[];

  @ApiProperty({
    example: GEOREF_FUENTE,
    description:
      'Fuente del resultado. Puede ser Catálogo de Ciudad Limpia o Servicio Georef – argentina.gob.ar/georef.',
  })
  fuente!: string;
}

export class GeocodificacionInversaResponse extends GeocodificacionInversaQuery {
  @ApiProperty({ type: DireccionSugeridaDto, nullable: true })
  direccionSugerida!: DireccionSugeridaDto | null;

  @ApiProperty({ example: GEOREF_FUENTE })
  fuente!: string;
}
