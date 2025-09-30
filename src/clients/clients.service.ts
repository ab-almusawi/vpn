import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Client } from '../entities/client.entity';
import { WireguardService } from '../vpn/wireguard.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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

  async createClient(createClientDto: any): Promise<Client> {
    const { deviceId, deviceName, realIp } = createClientDto;
    
    const existingClient = await this.clientRepository.findOne({
      where: { deviceId }
    });

    if (existingClient) {
      throw new Error('Client with this device ID already exists');
    }

    // This would typically be handled by the VPN service
    // For now, just create the client record
    const client = this.clientRepository.create({
      deviceId,
      deviceName,
      realIp,
      vpnIp: '10.0.0.100', // Placeholder
      publicKey: 'placeholder-key',
      privateKey: 'placeholder-key',
      isActive: true,
    });

    return await this.clientRepository.save(client);
  }

  async updateClient(id: string, updateClientDto: any): Promise<Client> {
    const client = await this.getClientById(id);
    
    Object.assign(client, updateClientDto);
    return await this.clientRepository.save(client);
  }

  async activateClient(id: string): Promise<void> {
    const client = await this.getClientById(id);
    client.isActive = true;
    await this.clientRepository.save(client);
  }

  async searchClients(query: string, filter?: string): Promise<Client[]> {
    const queryBuilder = this.clientRepository.createQueryBuilder('client');
    
    queryBuilder.where(
      '(client.deviceName ILIKE :query OR client.country ILIKE :query OR client.city ILIKE :query OR client.realIp ILIKE :query)',
      { query: `%${query}%` }
    );

    if (filter === 'active') {
      queryBuilder.andWhere('client.isActive = :isActive', { isActive: true });
    } else if (filter === 'inactive') {
      queryBuilder.andWhere('client.isActive = :isActive', { isActive: false });
    }

    return await queryBuilder
      .select([
        'client.id',
        'client.deviceId',
        'client.deviceName',
        'client.realIp',
        'client.country',
        'client.city',
        'client.vpnIp',
        'client.isActive',
        'client.lastHandshake',
        'client.createdAt'
      ])
      .orderBy('client.createdAt', 'DESC')
      .getMany();
  }

  async bulkDeactivateClients(clientIds: string[]): Promise<void> {
    console.log(`Bulk deactivating ${clientIds.length} clients...`);
    
    // First, get the clients to be deactivated (need their public keys for WireGuard removal)
    const clientsToDeactivate = await this.clientRepository.find({
      where: { id: In(clientIds) },
      select: ['id', 'deviceId', 'publicKey']
    });

    console.log(`Found ${clientsToDeactivate.length} clients to deactivate`);

    // Update database first
    await this.clientRepository
      .createQueryBuilder()
      .update(Client)
      .set({ isActive: false })
      .where('id IN (:...clientIds)', { clientIds })
      .execute();

    console.log('Database updated, now removing peers from WireGuard server...');

    // Remove each client from WireGuard server
    const removalPromises = clientsToDeactivate.map(async (client) => {
      try {
        await this.wireguardService.removePeerFromServer(client);
        console.log(`✅ Removed client ${client.deviceId} from WireGuard server`);
      } catch (error) {
        console.error(`❌ Failed to remove client ${client.deviceId} from WireGuard server: ${error.message}`);
        // Don't throw here, continue with other clients
      }
    });

    // Wait for all removals to complete
    await Promise.allSettled(removalPromises);
    console.log(`Bulk deactivation completed for ${clientIds.length} clients`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncStatsAutomatically() {
    console.log('Running automatic client stats synchronization...');
    await this.updateClientStats();
  }

  async getDiagnostics() {
    try {
      console.log('Getting client-server diagnostics...');
      
      // Get server stats
      const serverStats = await this.wireguardService.getServerStats();
      
      // Get all database clients
      const dbClients = await this.clientRepository.find({
        order: { createdAt: 'DESC' }
      });

      // Find matches and mismatches
      const matchedClients = [];
      const unmatchedDbClients = [];
      const unmatchedServerPeers = [...serverStats.peers];

      for (const client of dbClients) {
        const peerIndex = unmatchedServerPeers.findIndex(peer => peer.publicKey === client.publicKey);
        if (peerIndex >= 0) {
          const peer = unmatchedServerPeers[peerIndex];
          matchedClients.push({
            client: {
              id: client.id,
              deviceId: client.deviceId,
              deviceName: client.deviceName,
              vpnIp: client.vpnIp,
              publicKey: client.publicKey,
              isActive: client.isActive,
              lastHandshake: client.lastHandshake,
              bytesReceived: client.bytesReceived,
              bytesSent: client.bytesSent
            },
            serverPeer: peer,
            status: 'MATCHED'
          });
          unmatchedServerPeers.splice(peerIndex, 1);
        } else {
          unmatchedDbClients.push({
            id: client.id,
            deviceId: client.deviceId,
            deviceName: client.deviceName,
            vpnIp: client.vpnIp,
            publicKey: client.publicKey,
            isActive: client.isActive,
            status: 'DB_ONLY'
          });
        }
      }

      const serverOnlyPeers = unmatchedServerPeers.map(peer => ({
        ...peer,
        status: 'SERVER_ONLY'
      }));

      const diagnostics = {
        timestamp: new Date().toISOString(),
        serverStats: {
          interface: serverStats.interface,
          totalPeers: serverStats.totalPeers,
          error: (serverStats as any).error || null
        },
        databaseStats: {
          totalClients: dbClients.length,
          activeClients: dbClients.filter(c => c.isActive).length,
          inactiveClients: dbClients.filter(c => !c.isActive).length
        },
        synchronization: {
          matchedCount: matchedClients.length,
          dbOnlyCount: unmatchedDbClients.length,
          serverOnlyCount: serverOnlyPeers.length,
          syncHealthy: unmatchedDbClients.length === 0 && serverOnlyPeers.length === 0
        },
        details: {
          matchedClients,
          dbOnlyClients: unmatchedDbClients,
          serverOnlyPeers
        },
        recommendations: this.generateSyncRecommendations(unmatchedDbClients.length, serverOnlyPeers.length)
      };

      console.log(`Diagnostics completed: ${matchedClients.length} matched, ${unmatchedDbClients.length} DB-only, ${serverOnlyPeers.length} server-only`);
      return diagnostics;
    } catch (error) {
      console.error('Failed to get diagnostics:', error);
      throw error;
    }
  }

  private generateSyncRecommendations(dbOnlyCount: number, serverOnlyCount: number): string[] {
    const recommendations = [];

    if (dbOnlyCount > 0) {
      recommendations.push(
        `Found ${dbOnlyCount} clients in database but not on server. These clients may need to be re-added to WireGuard or cleaned up from database.`
      );
    }

    if (serverOnlyCount > 0) {
      recommendations.push(
        `Found ${serverOnlyCount} peers on server but not in database. These may be manually added peers or orphaned configurations.`
      );
    }

    if (dbOnlyCount === 0 && serverOnlyCount === 0) {
      recommendations.push('✅ Database and server are perfectly synchronized!');
    } else {
      recommendations.push('🔄 Run POST /clients/sync-stats to update database with current server statistics.');
    }

    return recommendations;
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
