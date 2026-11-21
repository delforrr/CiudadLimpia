import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateConductorDto {
  @ApiProperty({ example: 'Juan', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'Pérez', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido!: string;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsBoolean()
  activo?: boolean;
}

export class UpdateConductorDto extends PartialType(CreateConductorDto, {
  skipNullProperties: false,
}) {}

export class ConductorResponseDto extends OmitType(CreateConductorDto, [
  'activo',
]) {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  activo!: boolean;
}
