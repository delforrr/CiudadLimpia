import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { LineStringDto } from '../trayecto/trayecto.dto';

export class HoyDomicilioParamsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() direccionId!: string;
}

export class CoordenadasHoyDto {
  @ApiProperty() lat!: number;
  @ApiProperty() long!: number;
}

export class TrayectoHoyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() recorridoId!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty({ type: LineStringDto }) geometria!: LineStringDto;
}

export class CamionHoyDto {
  @ApiProperty({ format: 'uuid' }) servicioId!: string;
  @ApiProperty({ format: 'uuid' }) camionId!: string;
  @ApiProperty({ format: 'uuid' }) trayectoId!: string;
  @ApiProperty() recorridoId!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty({ type: CoordenadasHoyDto }) posicion!: CoordenadasHoyDto;
  @ApiProperty({ format: 'date-time' }) registradoEn!: string;
}

export class TrayectosHoyResponseDto {
  @ApiProperty({ type: CoordenadasHoyDto }) domicilio!: CoordenadasHoyDto;
  @ApiProperty({ type: [TrayectoHoyDto] }) trayectos!: TrayectoHoyDto[];
}

export class MapaHoyResponseDto extends TrayectosHoyResponseDto {
  @ApiProperty({ type: [CamionHoyDto] }) camiones!: CamionHoyDto[];
}
