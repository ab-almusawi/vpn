import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client } from '../entities/client.entity';

const execAsync = promisify(exec);

@Injectable()
export class WireguardService {
  constructor(private configService: ConfigService) {}

  generateKeyPair(): { publicKey: string; privateKey: string; presharedKey: string } {
    return {
      privateKey: this.generateRandomKey(),
      publicKey: this.generateRandomKey(),
      presharedKey: this.generateRandomKey(),
    };
  }

  private generateRandomKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateClientConfig(client: Client): Promise<string> {
    const serverPublicKey = await this.getServerPublicKey();
    const serverEndpoint = `${this.configService.get('VPN_SERVER_PUBLIC_IP')}:${this.configService.get('VPN_SERVER_PORT', 51820)}`;

    const config = `[Interface]
PrivateKey = ${client.privateKey}
Address = ${client.vpnIp}/16
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverEndpoint}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`;

    return config;
  }

  async addPeerToServer(client: Client): Promise<void> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      
      const peerConfig = `[Peer]
PublicKey = ${client.publicKey}
AllowedIPs = ${client.vpnIp}/32`;

      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);

      await fs.appendFile(configFile, '\n' + peerConfig + '\n');

      await execAsync(`wg syncconf ${interface$} <(wg-quick strip ${interface$})`);
      
      console.log(`Added peer for client ${client.deviceId} with IP ${client.vpnIp}`);
    } catch (error) {
      console.error(`Failed to add peer for client ${client.deviceId}:`, error);
      throw error;
    }
  }

  async removePeerFromServer(client: Client): Promise<void> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      
      await execAsync(`wg set ${interface$} peer ${client.publicKey} remove`);
      
      await this.updateConfigFile(client, 'remove');
      
      console.log(`Removed peer for client ${client.deviceId}`);
    } catch (error) {
      console.error(`Failed to remove peer for client ${client.deviceId}:`, error);
      throw error;
    }
  }

  private async getServerPublicKey(): Promise<string> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      const { stdout } = await execAsync(`wg show ${interface$} public-key`);
      return stdout.trim();
    } catch (error) {
      console.warn('Could not get server public key from WireGuard, using placeholder');
      return 'SERVER_PUBLIC_KEY_PLACEHOLDER';
    }
  }

  private async updateConfigFile(client: Client, action: 'add' | 'remove'): Promise<void> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);

      const content = await fs.readFile(configFile, 'utf8');
      const lines = content.split('\n');

      if (action === 'remove') {
        let inPeerSection = false;
        let peerToRemove = false;
        const filteredLines = [];

        for (const line of lines) {
          if (line.startsWith('[Peer]')) {
            inPeerSection = true;
            peerToRemove = false;
          } else if (line.startsWith('[') && !line.startsWith('[Peer]')) {
            inPeerSection = false;
            peerToRemove = false;
          }

          if (inPeerSection && line.includes(`PublicKey = ${client.publicKey}`)) {
            peerToRemove = true;
          }

          if (!peerToRemove || !inPeerSection) {
            filteredLines.push(line);
          } else if (peerToRemove && line.trim() === '') {
            peerToRemove = false;
            inPeerSection = false;
          }
        }

        await fs.writeFile(configFile, filteredLines.join('\n'));
      }
    } catch (error) {
      console.error('Failed to update config file:', error);
    }
  }

  async getServerStats() {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      const { stdout } = await execAsync(`wg show ${interface$}`);
      
      const lines = stdout.trim().split('\n');
      const peers = [];
      let currentPeer = null;

      for (const line of lines) {
        if (line.startsWith('peer ')) {
          if (currentPeer) peers.push(currentPeer);
          currentPeer = { publicKey: line.split(' ')[1] };
        } else if (currentPeer && line.includes('latest handshake')) {
          const handshakeMatch = line.match(/latest handshake: (.+)/);
          if (handshakeMatch) {
            currentPeer.lastHandshake = handshakeMatch[1];
          }
        } else if (currentPeer && line.includes('transfer')) {
          const transferMatch = line.match(/transfer: (.+) received, (.+) sent/);
          if (transferMatch) {
            currentPeer.bytesReceived = transferMatch[1];
            currentPeer.bytesSent = transferMatch[2];
          }
        }
      }

      if (currentPeer) peers.push(currentPeer);

      return {
        interface: interface$,
        peers,
        totalPeers: peers.length,
      };
    } catch (error) {
      console.error('Failed to get server stats:', error);
      return {
        interface: this.configService.get('WIREGUARD_INTERFACE', 'wg0'),
        peers: [],
        totalPeers: 0,
        error: error.message,
      };
    }
  }
}
