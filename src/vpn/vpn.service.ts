import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../entities/client.entity';
import { CreateClientDto } from '../shared/dto/create-client.dto';
import { WireguardService } from './wireguard.service';
import { GeolocationService } from './geolocation.service';

@Injectable()
export class VpnService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private configService: ConfigService,
    private wireguardService: WireguardService,
    private geolocationService: GeolocationService,
  ) {}

  async registerClientWithPublicKey(createClientDto: CreateClientDto) {
    if (!createClientDto.deviceId) {
      throw new BadRequestException('Device ID is required');
    }

    if (!createClientDto.publicKey) {
      throw new BadRequestException('Public key is required for secure registration');
    }

    // Check if client already exists
    let client = await this.clientRepository.findOne({
      where: { deviceId: createClientDto.deviceId },
    });

    if (client) {
      // Update existing client
      client = await this.updateClientInfo(client, createClientDto);
    } else {
      // Create new client with provided public key
      client = await this.createNewClient(createClientDto);
    }

    const serverPublicKey = await this.wireguardService.getServerPublicKey();
    const serverEndpoint = `${this.configService.get('VPN_SERVER_PUBLIC_IP')}:${this.configService.get('VPN_SERVER_PORT', 51820)}`;
    const configTemplate = await this.wireguardService.generateClientConfig(client);

    return {
      success: true,
      clientInfo: {
        deviceId: client.deviceId,
        deviceName: client.deviceName,
        vpnIp: client.vpnIp,
        country: client.country,
        city: client.city,
      },
      serverConfig: {
        serverPublicKey,
        serverEndpoint,
        assignedIp: client.vpnIp,
        dns: '8.8.8.8, 8.8.4.4',
      },
      configTemplate,
      instructions: 'Use your private key with this configuration to connect to the VPN.'
    };
  }

  async getOrCreateClientConfig(createClientDto: CreateClientDto) {
    if (!createClientDto.deviceId) {
      throw new BadRequestException('Device ID is required');
    }

    let client = await this.clientRepository.findOne({
      where: { deviceId: createClientDto.deviceId },
    });

    if (!client) {
      client = await this.createNewClient(createClientDto);
    } else {
      client = await this.updateClientInfo(client, createClientDto);
    }

    const config = await this.wireguardService.generateClientConfig(client);

    return {
      success: true,
      config,
      clientInfo: {
        deviceId: client.deviceId,
        deviceName: client.deviceName,
        vpnIp: client.vpnIp,
        country: client.country,
        city: client.city,
      },
    };
  }

  private async createNewClient(createClientDto: CreateClientDto): Promise<Client> {
    let publicKey: string;
    let privateKey: string;
    let presharedKey: string;

    if (createClientDto.publicKey) {
      // Client provided their public key (preferred approach)
      publicKey = createClientDto.publicKey;
      privateKey = ''; // Client keeps their private key
      const { presharedKey: generatedPsk } = await this.wireguardService.generateKeyPair();
      presharedKey = generatedPsk;
    } else {
      // Fallback: Generate keys server-side
      const keyPair = await this.wireguardService.generateKeyPair();
      publicKey = keyPair.publicKey;
      privateKey = keyPair.privateKey;
      presharedKey = keyPair.presharedKey;
    }

    const vpnIp = await this.getNextAvailableIp();
    const location = await this.geolocationService.getLocationByIp(createClientDto.realIp);

    const client = this.clientRepository.create({
      deviceId: createClientDto.deviceId,
      deviceName: createClientDto.deviceName,
      realIp: createClientDto.realIp,
      country: location.country,
      city: location.city,
      vpnIp,
      publicKey,
      privateKey,
      presharedKey,
      isActive: true,
    });

    const savedClient = await this.clientRepository.save(client);

    await this.wireguardService.addPeerToServer(savedClient);

    return savedClient;
  }

  private async updateClientInfo(client: Client, createClientDto: CreateClientDto): Promise<Client> {
    let shouldUpdate = false;

    if (client.realIp !== createClientDto.realIp) {
      client.realIp = createClientDto.realIp;
      const location = await this.geolocationService.getLocationByIp(createClientDto.realIp);
      client.country = location.country;
      client.city = location.city;
      shouldUpdate = true;
    }

    if (createClientDto.deviceName && client.deviceName !== createClientDto.deviceName) {
      client.deviceName = createClientDto.deviceName;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await this.clientRepository.save(client);
    }

    return client;
  }

  private async getNextAvailableIp(): Promise<string> {
    const existingIps = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.vpnIp')
      .getMany();

    const usedIps = new Set(existingIps.map(client => client.vpnIp));

    // Use 172.16.0.0/16 subnet to match existing WireGuard setup
    for (let subnet = 0; subnet <= 255; subnet++) {
      for (let host = (subnet === 0 ? 2 : 1); host <= 254; host++) {
        const ip = `172.16.${subnet}.${host}`;
        if (!usedIps.has(ip)) {
          return ip;
        }
      }
    }

    throw new BadRequestException('No available IP addresses in the range');
  }

  async getAllClients(): Promise<Client[]> {
    return await this.clientRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getClientById(id: string): Promise<Client> {
    return await this.clientRepository.findOne({ where: { id } });
  }

  async deactivateClient(deviceId: string): Promise<void> {
    const client = await this.clientRepository.findOne({ where: { deviceId } });
    if (client) {
      client.isActive = false;
      await this.clientRepository.save(client);
      await this.wireguardService.removePeerFromServer(client);
    }
  }

  async getServerStats() {
    return await this.wireguardService.getServerStats();
  }
}
