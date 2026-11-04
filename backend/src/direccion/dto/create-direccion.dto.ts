import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDireccionDto {
  @ApiProperty({ example: 'Roca', maxLength: 180 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ').normalize('NFC')
      : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  calle!: string;

  @ApiProperty({ example: 50, minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  altura!: number;
}
