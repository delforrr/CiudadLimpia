import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';

export class DomicilioResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'San Martín 123' })
  direccion!: string;

  @ApiProperty({
    type: String,
    example: 'Casa',
    maxLength: 100,
    nullable: true,
  })
  etiqueta!: string | null;
}

export class ClienteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana María' })
  name!: string;

  @ApiProperty({ example: 'Pérez' })
  lastName!: string;

  @ApiProperty({ type: DomicilioResponseDto, isArray: true })
  domicilios!: DomicilioResponseDto[];
}

export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'e39c2c9a-4a86-4148-a567-5f20c776bf44',
  })
  id!: string;

  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ type: ClienteResponseDto, nullable: true })
  cliente!: ClienteResponseDto | null;
}
