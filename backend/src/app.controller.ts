import { Controller, Get } from '@nestjs/common';

import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({
    summary: 'Consultar si la API está levantada',
    description:
      'Endpoint público de liveness. No comprueba la conexión con PostgreSQL.',
  })
  @ApiOkResponse({
    description: 'La API está levantada.',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'], example: 'ok' } },
    },
  })
  getHealth() {
    return { status: 'ok' };
  }
}
