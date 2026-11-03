import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePuntoLimpioDto {
  @ApiProperty({ example: 'Parque Villegas', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4')
  tipoId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000002',
  })
  @IsUUID('4')
  direccionId!: string;

  @ApiProperty({ example: -35.97, minimum: -90, maximum: 90 })
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -62.73, minimum: -180, maximum: 180 })
  @IsNumber()
  @IsLongitude()
  long!: number;
}
