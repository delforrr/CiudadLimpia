import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

// Una zona horaria explícita evita interpretar el mismo instante de forma distinta.
const fechaConZona =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export class ContratoConductorIdDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idCamion!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idConductor!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-21T08:00:00-03:00',
  })
  @IsDateString({ strict: true })
  @Matches(fechaConZona)
  fechaInicio!: string;
}

export class CreateContratoConductorDto extends ContratoConductorIdDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(fechaConZona)
  fechaFin?: string | null;
}

export class UpdateContratoConductorDto {
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @ValidateIf((_dto, value) => value !== null)
  @IsDateString({ strict: true })
  @Matches(fechaConZona)
  fechaFin!: string | null;
}

export class ContratoConductorResponseDto extends PickType(
  ContratoConductorIdDto,
  ['idCamion', 'idConductor'],
) {
  @ApiProperty({ type: String, format: 'date-time' })
  fechaInicio!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fechaFin!: Date | null;
}

export class ContratoVigenteResponseDto {
  @ApiProperty({ type: () => ContratoConductorResponseDto, nullable: true })
  contrato!: ContratoConductorResponseDto | null;
}
