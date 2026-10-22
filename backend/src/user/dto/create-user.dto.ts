import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums';
import { LoginRequestDto } from '../../auth/dto/login-request.dto';
import { SigninRequestDto } from '../../auth/dto/signin-request.dto';

export class DomicilioDto {
  @ApiProperty({ example: 'San Martín 123', minLength: 1, maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  direccion!: string;
}

export class ClienteDto extends PickType(SigninRequestDto, [
  'name',
  'lastName',
] as const) {
  @ApiPropertyOptional({
    type: DomicilioDto,
    isArray: true,
    maxItems: 20,
    description:
      'Si se envía al actualizar, reemplaza la lista completa de domicilios.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DomicilioDto)
  domicilios?: DomicilioDto[];
}

export class CreateUserDto extends PickType(LoginRequestDto, [
  'email',
  'password',
] as const) {
  @ApiPropertyOptional({ enum: Role, enumName: 'Role', default: Role.USER })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ type: ClienteDto })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @ValidateNested()
  @Type(() => ClienteDto)
  cliente?: ClienteDto;
}
