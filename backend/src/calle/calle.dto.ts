import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CalleDto {
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
}

export class CalleResponseDto extends CalleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export function claveCalle(calle: string) {
  return calle.toLocaleLowerCase('es-AR');
}
