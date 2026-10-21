import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'e39c2c9a-4a86-4148-a567-5f20c776bf44',
  })
  id!: string;

  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  email!: string;

  @ApiProperty({ example: 'Ana María' })
  name!: string;

  @ApiProperty({ example: 'Pérez' })
  lastName!: string;
}
