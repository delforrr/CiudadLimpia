import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CreatePuntoTrayectoDto,
  PuntoTrayectoResponseDto,
} from '../punto-trayecto/punto-trayecto.dto';

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

export class TrayectoResponseDto extends TrayectoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: [PuntoTrayectoResponseDto] })
  puntos!: PuntoTrayectoResponseDto[];
}
