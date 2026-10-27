import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsObject, ValidateNested } from 'class-validator';
import { LoginRequestDto } from '../../auth/dto/login-request.dto';
import { SigninRequestDto } from '../../auth/dto/signin-request.dto';

export class ClienteDto extends PickType(SigninRequestDto, [
  'name',
  'lastName',
  'domicilios',
] as const) {}

export class CreateUserDto extends PickType(LoginRequestDto, [
  'email',
  'password',
] as const) {
  @ApiProperty({ type: ClienteDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ClienteDto)
  cliente!: ClienteDto;
}
