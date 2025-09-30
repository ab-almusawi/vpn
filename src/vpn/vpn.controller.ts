import { Controller, Get, Post, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { VpnService } from './vpn.service';
import { WireguardService } from './wireguard.service';
import { CreateClientDto } from '../shared/dto/create-client.dto';
import { RegisterVpnClientDto } from '../shared/dto/register-vpn-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('vpn')
@Controller('vpn')
export class VpnController {
  constructor(
    private readonly vpnService: VpnService,
    private readonly wireguardService: WireguardService,
  ) {}

    @Post('register')
  @ApiOperation({
    summary: 'Register VPN client with server-generated keys',
    description: 'Client sends minimal device info. Server automatically generates all WireGuard keys and extracts real IP from request headers.'
  })
  @ApiResponse({
    status: 201,
    description: 'Client registered successfully with server-generated keys',
    example: {
      success: true,
      isNewClient: true,
      clientInfo: {
        deviceId: 'unique-device-identifier',
        deviceName: 'Samsung Galaxy S21',
        vpnIp: '172.16.0.2',
        country: 'Iraq',
        city: 'Amarah'
      },
      serverConfig: {
        serverPublicKey: 'CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=',
        serverEndpoint: '81.30.161.139:51820',
        assignedIp: '172.16.0.2',
        dns: '8.8.8.8, 8.8.4.4'
      },
      clientKeys: {
        privateKey: 'iPbR70lgp09QQ9GS/BQE1FVmSLI2H/F9qavzBUpV9X0=',
        publicKey: 'CZiCVeZpKH97PNrY/1rodYAPeLDF3AaPrxFo+gOnLx8=',
        presharedKey: 'DummyPresharedKey+development+use+only+key+here='
      },
      configTemplate: '[Interface]\nPrivateKey = iPbR70lgp09QQ9GS/BQE1FVmSLI2H/F9qavzBUpV9X0=\nAddress = 172.16.0.2/16\nDNS = 8.8.8.8, 8.8.4.4\n\n[Peer]\nPublicKey = CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=\nEndpoint = 81.30.161.139:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25',
      instructions: 'Use the provided private key with this configuration to connect to the VPN.'
    }
  })
  async registerClient(
    @Body() registerDto: RegisterVpnClientDto,
    @Req() request?: Request,
  ) {
    const realIp = this.extractClientIp(request);
    
    // Convert to CreateClientDto format for service layer
    const createClientDto: CreateClientDto = {
      deviceId: registerDto.deviceId,
      deviceName: registerDto.deviceName,
      realIp: registerDto.realIp || realIp, // Use client-provided IP or extract from headers
    };

    return await this.vpnService.registerClient(createClientDto);
  }

  @Get('get-config')
  @ApiOperation({
    summary: 'Get VPN configuration (Legacy - Server generates keys)',
    description: 'Server generates keys for client (less secure, for backward compatibility)'
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
      config: '[Interface]\nPrivateKey = ABCD...\nAddress = 172.16.0.2/16\nDNS = 8.8.8.8\n\n[Peer]\nPublicKey = EFGH...\nEndpoint = 81.30.161.139:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25',
      clientInfo: {
        deviceId: 'device_12345_android',
        vpnIp: '172.16.0.2',
        country: 'United States',
        city: 'New York'
      },
      warning: 'Server-side key generation is less secure. Consider using /register endpoint.'
    }
  })
  async getConfig(
    @Query('deviceId') deviceId: string,
    @Query('deviceName') deviceName?: string,
    @Req() request?: Request,
  ) {
    const realIp = this.extractClientIp(request);

    const result = await this.vpnService.getOrCreateClientConfig({
      deviceId,
      deviceName,
      realIp,
    });

    return {
      ...result,
      warning: 'Server-side key generation is less secure. Consider using POST /register endpoint.'
    };
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

  @Get('verify-server')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify server WireGuard configuration',
    description: 'Check if the server WireGuard keys match the expected configuration and the interface is active'
  })
  @ApiResponse({
    status: 200,
    description: 'Server configuration verification results',
    example: {
      isValid: true,
      currentPublicKey: 'CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=',
      expectedPublicKey: 'CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=',
      errors: null
    }
  })
  async verifyServerConfiguration() {
    return await this.wireguardService.verifyServerConfiguration();
  }

  @Get('validate-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate WireGuard configuration file',
    description: 'Check if the WireGuard configuration file is valid and properly formatted'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration validation results',
    example: {
      isValid: true,
      errors: []
    }
  })
  async validateWireGuardConfig() {
    return await this.wireguardService.validateWireGuardConfig();
  }

  @Post('interface/up')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start WireGuard interface',
    description: 'Execute "wg-quick up wg0" to start the WireGuard VPN interface'
  })
  @ApiResponse({
    status: 200,
    description: 'WireGuard interface started successfully',
    example: {
      success: true,
      message: 'WireGuard interface wg0 started successfully',
      interface: 'wg0',
      timestamp: '2025-01-01T12:00:00.000Z'
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to start WireGuard interface'
  })
  async startWireGuardInterface() {
    return await this.wireguardService.startInterface();
  }

  @Post('interface/down')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stop WireGuard interface',
    description: 'Execute "wg-quick down wg0" to stop the WireGuard VPN interface'
  })
  @ApiResponse({
    status: 200,
    description: 'WireGuard interface stopped successfully',
    example: {
      success: true,
      message: 'WireGuard interface wg0 stopped successfully',
      interface: 'wg0',
      timestamp: '2024-01-01T12:00:00.000Z'
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to stop WireGuard interface'
  })
  async stopWireGuardInterface() {
    return await this.wireguardService.stopInterface();
  }

  @Post('service/restart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restart VPN API service',
    description: 'Execute "systemctl restart vpn-api" to restart the VPN API service'
  })
  @ApiResponse({
    status: 200,
    description: 'VPN API service restart initiated successfully',
    example: {
      success: true,
      message: 'VPN API service restart initiated successfully',
      service: 'vpn-api',
      timestamp: '2024-01-01T12:00:00.000Z',
      warning: 'Service will restart shortly, API may be temporarily unavailable'
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to restart VPN API service'
  })
  async restartVpnApiService() {
    return await this.wireguardService.restartVpnApiService();
  }

  @Get('service/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get VPN service status',
    description: 'Check the status of WireGuard interface and VPN API service'
  })
  @ApiResponse({
    status: 200,
    description: 'Service status retrieved successfully',
    example: {
      wireguard: {
        interface: 'wg0',
        status: 'active',
        uptime: '2 days, 5 hours',
        peers: 3
      },
      vpnApiService: {
        service: 'vpn-api',
        status: 'active',
        uptime: '1 day, 12 hours'
      },
      timestamp: '2024-01-01T12:00:00.000Z'
    }
  })
  async getServiceStatus() {
    return await this.wireguardService.getServiceStatus();
  }
}
