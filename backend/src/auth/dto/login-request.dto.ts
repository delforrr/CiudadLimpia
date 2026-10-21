import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsByteLength,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    format: 'email',
    example: 'ana@example.com',
    maxLength: 254,
    description: 'Se recortan espacios y se convierte a minúsculas.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Debe tener formato de email' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    format: 'password',
    writeOnly: true,
    minLength: 8,
    maxLength: 72,
    example: 'Ejemplo-seguro!2026',
    description:
      'Entre 8 caracteres y 72 bytes UTF-8. Conserva espacios y símbolos.',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsByteLength(0, 72, { message: 'La contraseña no puede superar 72 bytes' })
  password!: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Con true, la sesión y la cookie duran siete días. Por defecto, el JWT dura una hora y la cookie es de sesión.',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
