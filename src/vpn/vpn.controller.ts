import { Controller, Get, Post, Put, Body, Query, Req, UseGuards, BadRequestException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { VpnService } from './vpn.service';
import { WireguardService } from './wireguard.service';
import { CreateClientDto } from '../shared/dto/create-client.dto';
import { FixKeyMismatchDto, UpdatePublicKeyDto } from '../shared/dto/fix-key-mismatch.dto';
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
    summary: 'Register VPN client with public key (RECOMMENDED)',
    description: 'Client provides their public key for secure registration'
  })
  @ApiResponse({
    status: 201,
    description: 'Client registered successfully',
    example: {
      success: true,
      clientInfo: {
        deviceId: 'device_12345_android',
        vpnIp: '172.16.0.100',
        country: 'Iraq',
        city: 'Amarah'
      },
      serverConfig: {
        serverPublicKey: 'CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=',
        serverEndpoint: '81.30.161.139:51820',
        assignedIp: '172.16.0.100',
        dns: '8.8.8.8, 8.8.4.4'
      },
      configTemplate: '[Interface]\n# Add your private key here\nAddress = 172.16.0.100/16\nDNS = 8.8.8.8\n\n[Peer]\nPublicKey = M7XYM12p...\n...'
    }
  })
  async registerClient(
    @Body() createClientDto: CreateClientDto,
    @Req() request?: Request,
  ) {
    const realIp = this.extractClientIp(request);
    createClientDto.realIp = realIp;

    if (!createClientDto.publicKey) {
      throw new BadRequestException('Public key is required for client registration');
    }

    return await this.vpnService.registerClientWithPublicKey(createClientDto);
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

  @Post('fix-key-mismatch')
  @ApiOperation({
    summary: 'Fix client key mismatch',
    description: 'Remove old peer and add new peer with updated public key for existing client'
  })
  @ApiResponse({
    status: 200,
    description: 'Key mismatch fixed successfully',
    example: {
      success: true,
      message: 'Key mismatch fixed successfully. Old peer removed and new peer added.',
      clientInfo: {
        deviceId: 'android_honorrmo-n21_goovi.almusawi.vpn',
        deviceName: 'HONOR RMO-NX1',
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
      configTemplate: '[Interface]\n# Add your private key here\nAddress = 172.16.0.2/16\n...'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Client not found or invalid public key'
  })
  async fixKeyMismatch(@Body() fixKeyMismatchDto: FixKeyMismatchDto) {
    return await this.vpnService.fixKeyMismatch(
      fixKeyMismatchDto.deviceId,
      fixKeyMismatchDto.newPublicKey
    );
  }

  @Put('clients/:deviceId/public-key')
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier',
    example: 'android_honorrmo-n21_goovi.almusawi.vpn'
  })
  @ApiOperation({
    summary: 'Update client public key',
    description: 'Update a client\'s public key and refresh server peer configuration'
  })
  @ApiResponse({
    status: 200,
    description: 'Client public key updated successfully',
    example: {
      id: 'uuid-here',
      deviceId: 'android_honorrmo-n21_goovi.almusawi.vpn',
      deviceName: 'HONOR RMO-NX1',
      vpnIp: '172.16.0.2',
      isActive: true
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Client not found or invalid public key'
  })
  async updateClientPublicKey(
    @Param('deviceId') deviceId: string,
    @Body() updatePublicKeyDto: UpdatePublicKeyDto
  ) {
    return await this.vpnService.updateClientPublicKey(deviceId, updatePublicKeyDto.publicKey);
  }

  @Post('clients/:deviceId/remove-peer')
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier',
    example: 'android_honorrmo-n21_goovi.almusawi.vpn'
  })
  @ApiOperation({
    summary: 'Remove client peer from server',
    description: 'Remove a client\'s peer from the WireGuard server and mark client as inactive'
  })
  @ApiResponse({
    status: 200,
    description: 'Client peer removed successfully',
    example: {
      success: true,
      message: 'Peer for client android_honorrmo-n21_goovi.almusawi.vpn removed successfully'
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Client not found'
  })
  async removeClientPeer(@Param('deviceId') deviceId: string) {
    return await this.vpnService.removeClientPeer(deviceId);
  }
}
