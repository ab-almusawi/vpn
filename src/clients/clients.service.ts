import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { WireguardService } from '../vpn/wireguard.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private wireguardService: WireguardService,
  ) {}

  async getAllClients(): Promise<Client[]> {
    return await this.clientRepository.find({
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'deviceId',
        'deviceName',
        'realIp',
        'country',
        'city',
        'vpnIp',
        'isActive',
        'lastHandshake',
        'bytesSent',
        'bytesReceived',
        'createdAt',
        'updatedAt'
      ],
    });
  }

  async getClientById(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      select: [
        'id',
        'deviceId',
        'deviceName',
        'realIp',
        'country',
        'city',
        'vpnIp',
        'isActive',
        'lastHandshake',
        'bytesSent',
        'bytesReceived',
        'createdAt',
        'updatedAt'
      ],
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async deactivateClient(deviceId: string): Promise<void> {
    const client = await this.clientRepository.findOne({ 
      where: { deviceId },
    });

    if (!client) {
      throw new NotFoundException(`Client with device ID ${deviceId} not found`);
    }

    client.isActive = false;
    await this.clientRepository.save(client);

    try {
      await this.wireguardService.removePeerFromServer(client);
    } catch (error) {
      console.error(`Failed to remove peer from WireGuard server: ${error.message}`);
    }
  }

  async getClientsOverview() {
    const [
      totalClients,
      activeClients,
      inactiveClients,
      clientsByCountry,
      recentClients
    ] = await Promise.all([
      this.clientRepository.count(),
      this.clientRepository.count({ where: { isActive: true } }),
      this.clientRepository.count({ where: { isActive: false } }),
      this.getClientsByCountry(),
      this.getRecentClients(),
    ]);

    return {
      totalClients,
      activeClients,
      inactiveClients,
      clientsByCountry,
      recentClients,
    };
  }

  private async getClientsByCountry() {
    const result = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('client.isActive = :isActive', { isActive: true })
      .groupBy('client.country')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const countryStats = {};
    result.forEach(item => {
      countryStats[item.country || 'Unknown'] = parseInt(item.count);
    });

    return countryStats;
  }

  private async getRecentClients(): Promise<Partial<Client>[]> {
    return await this.clientRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      select: [
        'id',
        'deviceId',
        'deviceName',
        'country',
        'city',
        'vpnIp',
        'isActive',
        'createdAt'
      ],
    });
  }

  async updateClientStats(): Promise<void> {
    try {
      const serverStats = await this.wireguardService.getServerStats();
      const clients = await this.clientRepository.find();

      for (const client of clients) {
        const peerStats = serverStats.peers.find(peer => peer.publicKey === client.publicKey);
        
        if (peerStats) {
          if (peerStats.lastHandshake && peerStats.lastHandshake !== 'never') {
            client.lastHandshake = new Date(peerStats.lastHandshake);
          }

          if (peerStats.bytesReceived) {
            client.bytesReceived = this.parseBytesString(peerStats.bytesReceived);
          }

          if (peerStats.bytesSent) {
            client.bytesSent = this.parseBytesString(peerStats.bytesSent);
          }

          await this.clientRepository.save(client);
        }
      }
    } catch (error) {
      console.error('Failed to update client stats:', error);
    }
  }

  private parseBytesString(bytesStr: string): number {
    const units = {
      'B': 1,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024,
      'TiB': 1024 * 1024 * 1024 * 1024,
    };

    const match = bytesStr.match(/^([\d.]+)\s*([KMGT]?i?B)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    return Math.floor(value * (units[unit] || 1));
  }
}
