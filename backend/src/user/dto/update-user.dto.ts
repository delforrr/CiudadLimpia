import {
  ApiPropertyOptional,
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsObject, ValidateIf, ValidateNested } from 'class-validator';
import { Role } from '../../generated/prisma/enums';
import { ClienteDto, CreateUserDto } from './create-user.dto';

export class UpdateClienteDto extends IntersectionType(
  PickType(ClienteDto, ['name', 'lastName'] as const),
  PartialType(PickType(ClienteDto, ['domicilios'] as const), {
    skipNullProperties: false,
  }),
) {}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['cliente'] as const),
  {
    skipNullProperties: false,
  },
) {
  @ApiPropertyOptional({ enum: Role, enumName: 'Role' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ type: UpdateClienteDto })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateClienteDto)
  cliente?: UpdateClienteDto;
}
