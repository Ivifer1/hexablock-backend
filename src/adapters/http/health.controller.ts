import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { schemaRef } from './openapi.schemas.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check HTTP service availability' })
  @ApiOkResponse({
    description: 'Service is available.',
    schema: schemaRef('Health'),
  })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
