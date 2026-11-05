import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { CalleDto } from '../../calle/calle.dto';

export class CreateDireccionDto extends CalleDto {
  @ApiProperty({ example: 50, minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  altura!: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: -90,
    maximum: 90,
    example: -35.97,
    description: 'Enviar junto con long.',
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: -180,
    maximum: 180,
    example: -62.73,
    description: 'Enviar junto con lat.',
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  long?: number | null;
}
