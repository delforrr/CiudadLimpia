import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CalleDto {
  @ApiProperty({ example: 'Roca', maxLength: 180 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizarCalle(value) : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  calle!: string;
}

export class CalleResponseDto extends CalleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export function normalizarCalle(calle: string) {
  return calle.trim().replace(/\s+/g, ' ').normalize('NFC');
}

export function claveCalle(calle: string) {
  return normalizarCalle(calle).toLocaleLowerCase('es-AR');
}
