import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CalleResponseDto } from '../calle/calle.dto';
import { LadoRecoleccion } from '../generated/prisma/enums';
import {
  CreatePuntoTrayectoDto,
  PuntoTrayectoResponseDto,
} from './punto-trayecto.dto';

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

export class TramoTrayectoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  calleId!: string;

  @ApiProperty({ minimum: 0, description: 'Índice inicial de la LineString.' })
  @IsInt()
  @Min(0)
  desde!: number;

  @ApiProperty({ minimum: 1, description: 'Índice final de la LineString.' })
  @IsInt()
  @Min(1)
  hasta!: number;

  @ApiPropertyOptional({
    enum: LadoRecoleccion,
    default: LadoRecoleccion.AMBOS,
  })
  @ValidateIf((_, valor: unknown) => valor !== undefined)
  @IsEnum(LadoRecoleccion)
  lado?: LadoRecoleccion;
}

class TramoTrayectoResponseDto extends TramoTrayectoDto {
  @ApiProperty({ type: CalleResponseDto })
  calle!: CalleResponseDto;
}

export class CreateTrayectoDto extends TrayectoDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Zona de la localidad del trayecto.',
  })
  @IsUUID()
  zonaId!: string;

  @ApiProperty({ type: [CreatePuntoTrayectoDto], minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CreatePuntoTrayectoDto)
  puntos!: CreatePuntoTrayectoDto[];

  @ApiProperty({
    type: [TramoTrayectoDto],
    minItems: 1,
    description:
      'Tramos confirmados que cubren toda la línea en el sentido del recorrido.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => TramoTrayectoDto)
  tramos!: TramoTrayectoDto[];
}

export class UpdateTrayectoDto extends OmitType(CreateTrayectoDto, [
  'zonaId',
] as const) {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Omitir para conservar la zona actual.',
  })
  @ValidateIf((_, valor: unknown) => valor !== undefined)
  @IsUUID()
  zonaId?: string;
}

export class TrayectoResponseDto extends TrayectoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  zonaId!: string;

  @ApiProperty({ type: [PuntoTrayectoResponseDto] })
  puntos!: PuntoTrayectoResponseDto[];

  @ApiProperty({ type: [TramoTrayectoResponseDto] })
  tramos!: TramoTrayectoResponseDto[];
}
