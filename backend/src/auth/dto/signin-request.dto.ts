import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LoginRequestDto } from './login-request.dto';
import { DomicilioDto } from '../../user/dto/domicilio.dto';

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

  @ApiProperty({ type: DomicilioDto, isArray: true, minItems: 1, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Se requiere al menos un domicilio' })
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => DomicilioDto)
  domicilios!: DomicilioDto[];

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
