import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class PosicionTelemetriaDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() servicioId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() camionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() trayectoId!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/)
  registradoEn!: string;

  @ApiProperty() @IsNumber() @IsLatitude() lat!: number;
  @ApiProperty() @IsNumber() @IsLongitude() long!: number;
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) precisionM!: number;
}

export class AvisosTelemetriaDto {
  @ApiProperty() habilitado!: boolean;
  @ApiProperty() pendientes!: number;
  @ApiProperty() enviados!: number;
  @ApiProperty() cancelados!: number;
}
