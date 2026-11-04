import { ApiProperty } from '@nestjs/swagger';

export class DireccionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Roca 50' })
  direccion!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Roca' })
  calle!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 50 })
  altura!: number | null;
}
