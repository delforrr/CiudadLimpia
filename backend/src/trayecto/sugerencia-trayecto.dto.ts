import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { CoordenadasTrayectoDto, LineStringDto } from './trayecto.dto';

export class SugerirTrayectoDto {
  @ApiProperty({
    type: [CoordenadasTrayectoDto],
    minItems: 2,
    description: 'Puntos en el orden en que se deben recorrer.',
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CoordenadasTrayectoDto)
  puntos!: CoordenadasTrayectoDto[];
}

export class SugerenciaTrayectoDto {
  @ApiProperty({ type: LineStringDto })
  geometria!: LineStringDto;

  @ApiProperty({ example: 'OSRM · © colaboradores de OpenStreetMap' })
  fuente!: string;
}
