import { ApiProperty } from '@nestjs/swagger';

export class DireccionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'Roca 50',
    description:
      'Calle y altura para direcciones estructuradas, o texto libre para direcciones históricas.',
  })
  direccion!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Roca' })
  calle!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 50 })
  altura!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: -35.97 })
  lat!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: -62.73 })
  long!: number | null;
}
