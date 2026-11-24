import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, MaxLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateZonaDto {
  @ApiProperty({ example: 'Zona Urbana', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  nombre!: string;

  @ApiProperty({ example: '06826050' })
  @IsString()
  @Length(1, 50)
  localidadId!: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @Transform(trim)
  @ValidateIf((_, valor: unknown) => valor !== undefined)
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}

export class UpdateZonaDto extends PartialType(
  OmitType(CreateZonaDto, ['localidadId'] as const),
  { skipNullProperties: false },
) {}

export class ZonaResponseDto extends CreateZonaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  declare descripcion: string;
}
