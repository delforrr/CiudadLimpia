import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { CalleDto } from '../../calle/calle.dto';

export class FrenteDireccionDto extends CalleDto {
  @ApiProperty({ example: 50, minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  altura!: number;
}

export class CoordenadasDireccionDto {
  @ApiProperty({ minimum: -90, maximum: 90, example: -35.97 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -62.73 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  long!: number;
}

export class CreateDireccionDto extends IntersectionType(
  FrenteDireccionDto,
  CoordenadasDireccionDto,
) {}
