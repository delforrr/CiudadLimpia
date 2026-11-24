import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateTipoPuntoLimpioDto {
  @ApiProperty({ example: 'Botellero', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre!: string;

  @ApiPropertyOptional({ example: 'botellero', maxLength: 50 })
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(50)
  logo?: string | null;

  @ApiPropertyOptional({ example: '#148640' })
  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/i)
  colorFondo?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Nombres de materiales. Excluyente con residuos.',
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  )
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  materiales?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Identificadores de los residuos que acepta este tipo.',
    example: ['00000000-0000-4000-8000-000000000001'],
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  residuos?: string[];
}
