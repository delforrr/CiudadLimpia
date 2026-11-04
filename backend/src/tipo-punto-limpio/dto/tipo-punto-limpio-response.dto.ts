import { ApiProperty } from '@nestjs/swagger';

export class ResiduoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Plástico' })
  nombre!: string;
}

export class TipoPuntoLimpioResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Botellero' })
  nombre!: string;

  @ApiProperty({ type: [ResiduoResumenDto] })
  residuos!: ResiduoResumenDto[];
}
