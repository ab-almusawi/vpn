import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { VpnService } from './vpn.service';
import { CreateClientDto } from '../shared/dto/create-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('vpn')
@Controller('vpn')
export class VpnController {
  constructor(private readonly vpnService: VpnService) {}

  @Get('get-config')
  @ApiOperation({
    summary: 'Get VPN configuration for client',
    description: 'Retrieves or creates WireGuard configuration for a client device'
  })
  @ApiQuery({
    name: 'deviceId',
    description: 'Unique device identifier',
    example: 'device_12345_android'
  })
  @ApiQuery({
    name: 'deviceName',
    description: 'Human readable device name',
    required: false,
    example: 'John\'s iPhone'
  })
  @ApiResponse({
    status: 200,
    description: 'VPN configuration retrieved successfully',
    example: {
      success: true,
      config: '[Interface]\nPrivateKey = ABCD...\nAddress = 10.0.0.2/24\nDNS = 8.8.8.8\n\n[Peer]\nPublicKey = EFGH...\nEndpoint = 81.30.161.139:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25',
      clientInfo: {
        deviceId: 'device_12345_android',
        vpnIp: '10.0.0.2',
        country: 'United States',
        city: 'New York'
      }
    }
  })
  async getConfig(
    @Query('deviceId') deviceId: string,
    @Query('deviceName') deviceName?: string,
    @Req() request?: Request,
  ) {
    const realIp = this.extractClientIp(request);
    
    return await this.vpnService.getOrCreateClientConfig({
      deviceId,
      deviceName,
      realIp,
    });
  }

  private extractClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;
    const cfConnectingIp = request.headers['cf-connecting-ip'] as string;
    
    return cfConnectingIp || 
           realIp || 
           (forwarded && forwarded.split(',')[0]) || 
           request.connection?.remoteAddress || 
           request.ip ||
           '127.0.0.1';
  }

  @Get('server-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get WireGuard server statistics',
    description: 'Retrieve detailed WireGuard server statistics and peer information'
  })
  @ApiResponse({
    status: 200,
    description: 'Server statistics retrieved successfully',
    example: {
      interface: 'wg0',
      totalPeers: 25,
      peers: [
        {
          publicKey: 'ABC123...',
          lastHandshake: '2 minutes ago',
          bytesReceived: '1.2 MB',
          bytesSent: '890 KB'
        }
      ]
    }
  })
  async getServerStats() {
    return await this.vpnService.getServerStats();
  }
}
