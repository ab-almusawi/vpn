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

  async registerClient(createClientDto: CreateClientDto) {
    if (!createClientDto.deviceId) {
      throw new BadRequestException('Device ID is required');
    }

    // Check if client already exists
    let client = await this.clientRepository.findOne({
      where: { deviceId: createClientDto.deviceId },
    });

    let isNewClient = false;
    if (client) {
      // Update existing client info but regenerate keys
      client = await this.updateClientInfo(client, createClientDto);
      // Regenerate keys for existing client
      await this.regenerateClientKeys(client);
    } else {
      // Create new client with server-generated keys
      client = await this.createNewClient(createClientDto);
      isNewClient = true;
    }

    const serverPublicKey = await this.wireguardService.getServerPublicKey();
    const serverEndpoint = `${this.configService.get('VPN_SERVER_PUBLIC_IP')}:${this.configService.get('VPN_SERVER_PORT', 51820)}`;
    const configTemplate = await this.wireguardService.generateClientConfig(client);

    return {
      success: true,
      isNewClient,
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
        dns: '172.16.0.1',
      },
      clientKeys: {
        privateKey: client.privateKey,
        publicKey: client.publicKey,
        presharedKey: client.presharedKey,
      },
      configTemplate,
      instructions: 'Use the provided private key with this configuration to connect to the VPN.'
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
    console.log(`Creating new VPN client for device ${createClientDto.deviceId}`);
    
    // Always generate keys server-side
    const keyPair = await this.wireguardService.generateKeyPair();
    console.log(`Generated keys for new client ${createClientDto.deviceId}`);
    
    const vpnIp = await this.getNextAvailableIp();
    const location = await this.geolocationService.getLocationByIp(createClientDto.realIp);

    const client = this.clientRepository.create({
      deviceId: createClientDto.deviceId,
      deviceName: createClientDto.deviceName,
      realIp: createClientDto.realIp,
      country: location.country,
      city: location.city,
      vpnIp,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      presharedKey: keyPair.presharedKey,
      isActive: true,
    });

    const savedClient = await this.clientRepository.save(client);
    console.log(`Saved new client ${createClientDto.deviceId} to database with VPN IP ${vpnIp}`);

    try {
      await this.wireguardService.addPeerToServer(savedClient);
      console.log(`Successfully added new client ${createClientDto.deviceId} to VPN server`);
    } catch (error) {
      console.error(`Failed to add new client ${createClientDto.deviceId} to VPN server: ${error.message}`);
      // Clean up the database record if we can't add to VPN server
      await this.clientRepository.remove(savedClient);
      throw new BadRequestException(`Failed to register client with VPN server: ${error.message}`);
    }

    return savedClient;
  }

  private async regenerateClientKeys(client: Client): Promise<Client> {
    console.log(`Regenerating keys for client ${client.deviceId}`);
    
    // Store old public key for cleanup
    const oldPublicKey = client.publicKey;
    
    // Remove old peer from server first
    try {
      if (oldPublicKey && oldPublicKey.trim() !== '') {
        await this.wireguardService.removePeerFromServer(client);
        console.log(`Successfully removed old peer for ${client.deviceId}`);
        
        // Small delay to ensure file operations complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to remove old peer for ${client.deviceId}: ${error.message}`);
      // Continue with key generation even if removal fails
    }

    // Generate new keys
    const keyPair = await this.wireguardService.generateKeyPair();
    console.log(`Generated new keys for client ${client.deviceId}`);
    
    // Update client with new keys
    client.publicKey = keyPair.publicKey;
    client.privateKey = keyPair.privateKey;
    client.presharedKey = keyPair.presharedKey;
    client.updatedAt = new Date();

    const savedClient = await this.clientRepository.save(client);
    console.log(`Updated client ${client.deviceId} with new keys in database`);

    // Add new peer to server
    try {
      await this.wireguardService.addPeerToServer(savedClient);
      console.log(`Successfully added new peer for ${client.deviceId}`);
    } catch (error) {
      console.error(`Failed to add new peer for ${client.deviceId}: ${error.message}`);
      throw new BadRequestException(`Failed to register client with VPN server: ${error.message}`);
    }

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
