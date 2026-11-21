import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
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

export class CreatePuntoTrayectoDto extends PuntoTrayectoDto {
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

export class PuntoTrayectoResponseDto extends PuntoTrayectoDto {
  @ApiProperty({ format: 'uuid' })
  direccionId!: string;

  @ApiProperty({ type: DireccionResponseDto })
  direccion!: DireccionResponseDto;
}
