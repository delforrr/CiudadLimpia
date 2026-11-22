import { ApiProperty } from '@nestjs/swagger';

export class PuntoLimpioResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Parque Villegas' })
  nombre!: string;

  @ApiProperty({ format: 'uuid' })
  tipoId!: string;

  @ApiProperty({ format: 'uuid' })
  direccionId!: string;

  @ApiProperty({ example: -35.97 })
  lat!: number;

  @ApiProperty({ example: -62.73 })
  long!: number;
}
