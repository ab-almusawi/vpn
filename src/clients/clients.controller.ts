import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from '../shared/dto/create-client.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all VPN clients',
    description: 'Retrieves a list of all registered VPN clients'
  })
  @ApiResponse({
    status: 200,
    description: 'List of clients retrieved successfully',
    example: [
      {
        id: 'uuid-here',
        deviceId: 'device_12345_android',
        deviceName: 'John\'s Phone',
        realIp: '203.0.113.1',
        country: 'United States',
        city: 'New York',
        vpnIp: '10.0.0.2',
        isActive: true,
        lastHandshake: '2024-01-01T12:00:00.000Z',
        createdAt: '2024-01-01T10:00:00.000Z'
      }
    ]
  })
  async getAllClients() {
    return await this.clientsService.getAllClients();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get client by ID',
    description: 'Retrieves a specific client by their unique ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Client UUID',
    example: 'uuid-here'
  })
  @ApiResponse({
    status: 200,
    description: 'Client retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found'
  })
  async getClientById(@Param('id') id: string) {
    return await this.clientsService.getClientById(id);
  }

  @Delete(':deviceId')
  @ApiOperation({
    summary: 'Deactivate client',
    description: 'Deactivates a client and removes them from WireGuard server'
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier',
    example: 'device_12345_android'
  })
  @ApiResponse({
    status: 200,
    description: 'Client deactivated successfully'
  })
  async deactivateClient(@Param('deviceId') deviceId: string) {
    await this.clientsService.deactivateClient(deviceId);
    return { success: true, message: 'Client deactivated successfully' };
  }

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get client statistics overview',
    description: 'Retrieves overview statistics about VPN clients'
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    example: {
      totalClients: 25,
      activeClients: 20,
      inactiveClients: 5,
      clientsByCountry: {
        'United States': 10,
        'Canada': 5,
        'United Kingdom': 5,
        'Germany': 3,
        'Unknown': 2
      },
      recentClients: []
    }
  })
  async getClientsOverview() {
    return await this.clientsService.getClientsOverview();
  }
}
