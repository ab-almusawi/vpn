import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, appendFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { Client } from '../entities/client.entity';

const execAsync = promisify(exec);

@Injectable()
export class WireguardService {
  constructor(private configService: ConfigService) {}

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string; presharedKey: string }> {
    try {
      const { stdout: privateKey } = await execAsync('wg genkey');
      const { stdout: publicKey } = await execAsync(`echo "${privateKey.trim()}" | wg pubkey`);
      const { stdout: presharedKey } = await execAsync('wg genpsk');

      return {
        privateKey: privateKey.trim(),
        publicKey: publicKey.trim(),
        presharedKey: presharedKey.trim(),
      };
    } catch (error) {
      console.error('Failed to generate WireGuard keys:', error);
      // Fallback to dummy keys for development
      return {
        privateKey: '4JQOxUdA5nGoLcRHB6Qe1N6DBwrZX8shkuuir7KS1VA=',
        publicKey: 'CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=',
        presharedKey: 'DummyPresharedKey+development+use+only+key+here=',
      };
    }
  }

  async generateClientConfig(client: Client): Promise<string> {
    const serverPublicKey = await this.getServerPublicKey();
    const serverEndpoint = `${this.configService.get('VPN_SERVER_PUBLIC_IP')}:${this.configService.get('VPN_SERVER_PORT', 51820)}`;

    // If no private key stored (client-side key generation), provide template
    const privateKeyLine = client.privateKey 
      ? `PrivateKey = ${client.privateKey}` 
      : `# PrivateKey = YOUR_PRIVATE_KEY_HERE`;

    const config = `[Interface]
${privateKeyLine}
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

              await appendFile(configFile, '\n' + peerConfig + '\n');

      await execAsync(`bash -c "wg syncconf ${interface$} <(wg-quick strip ${interface$})"`);
      
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

  async getServerPublicKey(): Promise<string> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      
      // Try to get public key from running interface first
      try {
        const { stdout } = await execAsync(`wg show ${interface$} public-key`);
        if (stdout.trim()) {
          return stdout.trim();
        }
      } catch (error) {
        console.log('Interface not running, trying config file...');
      }

      // Fallback: read from config file
      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);
      
      try {
        const configContent = await readFile(configFile, 'utf8');
        const privateKeyMatch = configContent.match(/PrivateKey\s*=\s*(.+)/);
        if (privateKeyMatch) {
          const privateKey = privateKeyMatch[1].trim();
          const { stdout } = await execAsync(`echo "${privateKey}" | wg pubkey`);
          return stdout.trim();
        }
      } catch (error) {
        console.warn('Could not read config file');
      }

      console.warn('Could not get server public key from WireGuard, using placeholder');
      return 'SERVER_PUBLIC_KEY_PLACEHOLDER';
    } catch (error) {
      console.warn('Error getting server public key:', error);
      return 'SERVER_PUBLIC_KEY_PLACEHOLDER';
    }
  }

  private async updateConfigFile(client: Client, action: 'add' | 'remove'): Promise<void> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);

                const content = await readFile(configFile, 'utf8');
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

                  await writeFile(configFile, filteredLines.join('\n'));
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

  async verifyServerConfiguration(): Promise<{ isValid: boolean; currentPublicKey: string; expectedPublicKey?: string; errors?: string[] }> {
    const errors: string[] = [];
    const expectedPublicKey = 'CgZ3xhsR5w76yxQO4lHZGTaKh+R+wqgQA9HCPM8JQD4=';
    
    try {
      const currentPublicKey = await this.getServerPublicKey();
      
      if (currentPublicKey === 'SERVER_PUBLIC_KEY_PLACEHOLDER') {
        errors.push('Server public key could not be retrieved from WireGuard interface or config file');
      }
      
      if (currentPublicKey !== expectedPublicKey && currentPublicKey !== 'SERVER_PUBLIC_KEY_PLACEHOLDER') {
        console.log(`Current public key: ${currentPublicKey}`);
        console.log(`Expected public key: ${expectedPublicKey}`);
        console.log('Keys do not match - configuration may need updating');
      }
      
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      try {
        await execAsync(`wg show ${interface$}`);
      } catch (error) {
        errors.push(`WireGuard interface ${interface$} is not active`);
      }
      
      return {
        isValid: errors.length === 0 && currentPublicKey === expectedPublicKey,
        currentPublicKey,
        expectedPublicKey,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(`Failed to verify configuration: ${error.message}`);
      return {
        isValid: false,
        currentPublicKey: 'UNKNOWN',
        expectedPublicKey,
        errors,
      };
    }
  }
}
