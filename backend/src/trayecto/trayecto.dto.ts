import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CalleDto } from '../calle/calle.dto';
import { DireccionResponseDto } from '../direccion/dto/direccion-response.dto';

export class CoordenadasTrayectoDto {
  @ApiProperty({ example: -35.97, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: -62.73, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  long!: number;
}

class DireccionTrayectoDto extends CalleDto {
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 2147483647,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  altura?: number | null;
}

class PuntoTrayectoDto extends CoordenadasTrayectoDto {
  @ApiProperty({
    minimum: 0,
    description: 'Posición en el recorrido desde cero.',
  })
  @IsInt()
  @Min(0)
  orden!: number;
}

class CreatePuntoTrayectoDto extends PuntoTrayectoDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Identificador de una dirección pública existente. Puede omitirse para un pin.',
  })
  @ValidateIf(
    (punto: CreatePuntoTrayectoDto) => punto.direccionId !== undefined,
  )
  @IsUUID('4')
  direccionId?: string;

  @ApiPropertyOptional({
    type: DireccionTrayectoDto,
    description:
      'Calle y altura opcional. Puede omitirse para un pin. Enviar un solo campo entre direccion y direccionId.',
  })
  @ValidateIf((punto: CreatePuntoTrayectoDto) => punto.direccion !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => DireccionTrayectoDto)
  direccion?: DireccionTrayectoDto;
}

export class LineStringDto {
  @ApiProperty({ enum: ['LineString'] })
  @Equals('LineString')
  type!: 'LineString';

  @ApiProperty({
    type: 'array',
    minItems: 2,
    items: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'number' },
    },
    example: [
      [-62.73, -35.97],
      [-62.74, -35.98],
    ],
    description:
      'Posiciones [longitud, latitud] con al menos dos ubicaciones distintas.',
  })
  @IsArray()
  @ArrayMinSize(2)
  coordinates!: [number, number][];
}

class TrayectoDto {
  @ApiProperty({ example: 'Centro', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    example: '06826050',
    description: 'Identificador de una localidad del catálogo.',
  })
  @IsString()
  @MinLength(1)
  localidadId!: string;

  @ApiProperty({ type: LineStringDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LineStringDto)
  geometria!: LineStringDto;
}

export class CreateTrayectoDto extends TrayectoDto {
  @ApiProperty({ type: [CreatePuntoTrayectoDto], minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CreatePuntoTrayectoDto)
  puntos!: CreatePuntoTrayectoDto[];
}

class PuntoTrayectoResponseDto extends PuntoTrayectoDto {
  @ApiProperty({ format: 'uuid' })
  direccionId!: string;

  @ApiProperty({ type: DireccionResponseDto })
  direccion!: DireccionResponseDto;
}

export class TrayectoResponseDto extends TrayectoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: [PuntoTrayectoResponseDto] })
  puntos!: PuntoTrayectoResponseDto[];
}
