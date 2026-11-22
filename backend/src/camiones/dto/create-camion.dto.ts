import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { Estado } from '../../generated/prisma/enums';

export class CreateCamionDto {
  @ApiProperty({
    example: 'AB 123 CD',
    description: 'Patente o dominio del camión',
    minLength: 1,
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  patente!: string;

  @ApiProperty({
    example: 'Mercedes-Benz',
    description: 'Marca del camión',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  marca!: string;

  @ApiProperty({
    example: 'Atego 1729',
    description: 'Modelo del camión',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  modelo!: string;

  @ApiProperty({ example: 2020, minimum: 1, maximum: 9999 })
  @IsInt()
  @Min(1)
  @Max(9999)
  anio!: number;

  @ApiPropertyOptional({
    enum: Estado,
    enumName: 'Estado',
    example: Estado.ACTIVO,
    default: Estado.ACTIVO,
    description: 'Estado operativo del camión',
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(Estado)
  estado?: Estado;
}
