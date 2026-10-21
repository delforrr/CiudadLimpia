import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { LoginRequestDto } from './login-request.dto';

export class SigninRequestDto extends LoginRequestDto {
  @ApiProperty({ example: 'Ana María', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Se requiere un nombre' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Pérez', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Se requiere un apellido' })
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    format: 'password',
    writeOnly: true,
    maxLength: 72,
    example: 'Ejemplo-seguro!2026',
    description: 'Debe coincidir exactamente con password.',
  })
  @IsString()
  @MaxLength(72)
  repeatedPassword!: string;
}
