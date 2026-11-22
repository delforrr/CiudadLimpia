import { applyDecorators } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiExtraModels,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateDireccionDto } from './create-direccion.dto';

export class DireccionResponseDto extends CreateDireccionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Roca 50' })
  direccion!: string;
}

export class PinDireccionDistintoDto {
  @ApiProperty({ enum: [409] })
  statusCode!: 409;

  @ApiProperty({ enum: ['PIN_DIRECCION_DISTINTO'] })
  code!: 'PIN_DIRECCION_DISTINTO';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: DireccionResponseDto })
  direccion!: DireccionResponseDto;
}

export function ApiConflictoPin(description: string) {
  return applyDecorators(
    ApiExtraModels(PinDireccionDistintoDto),
    ApiConflictResponse({
      description,
      schema: {
        oneOf: [
          { $ref: getSchemaPath(PinDireccionDistintoDto) },
          {
            type: 'object',
            required: ['statusCode', 'message', 'error'],
            properties: {
              statusCode: { type: 'integer', enum: [409] },
              message: { type: 'string' },
              error: { type: 'string', example: 'Conflict' },
            },
          },
        ],
      },
    }),
  );
}
