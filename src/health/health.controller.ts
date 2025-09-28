import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns the current health status of the VPN backend service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    example: {
      status: 'ok',
      timestamp: '2024-01-01T12:00:00.000Z',
      uptime: 3600,
      version: '1.0.0',
      environment: 'development',
      database: {
        status: 'connected',
        responseTime: 12
      },
      wireguard: {
        status: 'active',
        interface: 'wg0',
        clients: 5
      }
    }
  })
  async getHealth() {
    return await this.healthService.getHealthStatus();
  }
}
