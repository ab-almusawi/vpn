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
      
      if (!client.publicKey || client.publicKey.trim() === '') {
        throw new Error('Client public key is missing or empty');
      }

      console.log(`Adding peer for client ${client.deviceId} with public key ${client.publicKey.trim()}`);

      const peerConfig = `
[Peer]
PublicKey = ${client.publicKey.trim()}
AllowedIPs = ${client.vpnIp}/32`;

      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);

      // Read current config to check for duplicates
      try {
        const currentConfig = await readFile(configFile, 'utf8');
        if (currentConfig.includes(`PublicKey = ${client.publicKey.trim()}`)) {
          console.log(`Peer with public key ${client.publicKey.trim()} already exists, skipping add`);
          return;
        }
      } catch (error) {
        console.warn('Could not read current config for duplicate check:', error.message);
      }

      await appendFile(configFile, peerConfig);

      // Validate and sync the configuration
      await this.validateAndSyncConfig();
      
      console.log(`Successfully added peer for client ${client.deviceId} with IP ${client.vpnIp}`);
    } catch (error) {
      console.error(`Failed to add peer for client ${client.deviceId}:`, error);
      throw error;
    }
  }

  private async validateAndSyncConfig(): Promise<void> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);

      // Validate the configuration file format
      const configContent = await readFile(configFile, 'utf8');
      const lines = configContent.split('\n');
      let inPeerSection = false;
      let currentPeerHasPublicKey = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('[Peer]')) {
          // Check if previous peer section had a public key
          if (inPeerSection && !currentPeerHasPublicKey) {
            throw new Error('Found peer section without PublicKey');
          }
          inPeerSection = true;
          currentPeerHasPublicKey = false;
        } else if (trimmedLine.startsWith('[') && !trimmedLine.startsWith('[Peer]')) {
          // Entering non-peer section
          if (inPeerSection && !currentPeerHasPublicKey) {
            throw new Error('Found peer section without PublicKey');
          }
          inPeerSection = false;
        } else if (inPeerSection && trimmedLine.startsWith('PublicKey =')) {
          const publicKey = trimmedLine.split('=')[1]?.trim();
          if (publicKey && publicKey.length > 0) {
            currentPeerHasPublicKey = true;
          }
        }
      }

      // Check last peer section
      if (inPeerSection && !currentPeerHasPublicKey) {
        throw new Error('Found peer section without PublicKey');
      }

      // Sync the configuration if validation passes
      await execAsync(`bash -c "wg syncconf ${interface$} <(wg-quick strip ${interface$})"`);
      console.log(`Configuration validated and synced successfully for ${interface$}`);
      
    } catch (error) {
      console.error('Configuration validation or sync failed:', error);
      throw new Error(`WireGuard configuration error: ${error.message}`);
    }
  }

  async removePeerFromServer(client: Client): Promise<void> {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      
      if (!client.publicKey || client.publicKey.trim() === '') {
        console.warn(`No public key found for client ${client.deviceId}, skipping peer removal`);
        return;
      }

      console.log(`Removing peer for client ${client.deviceId} with public key ${client.publicKey.trim()}`);

      // Remove from running configuration first
      try {
        await execAsync(`wg set ${interface$} peer ${client.publicKey.trim()} remove`);
        console.log(`Removed peer from running config: ${client.publicKey.trim()}`);
      } catch (error) {
        console.warn(`Peer ${client.publicKey.trim()} not found in running config:`, error.message);
      }
      
      // Remove from config file
      await this.updateConfigFile(client, 'remove');
      
      // Validate and sync configuration
      await this.validateAndSyncConfig();
      
      console.log(`Successfully removed peer for client ${client.deviceId}`);
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
        const filteredLines = [];
        let i = 0;
        
        while (i < lines.length) {
          const line = lines[i];
          
          // Check if this is a peer section that contains our public key
          if (line.trim().startsWith('[Peer]')) {
            let peerSectionLines = [line];
            let j = i + 1;
            let foundTargetPublicKey = false;
            
            // Collect all lines in this peer section
            while (j < lines.length && !lines[j].trim().startsWith('[')) {
              peerSectionLines.push(lines[j]);
              
              // Check if this peer section contains our target public key
              if (lines[j].includes(`PublicKey = ${client.publicKey.trim()}`)) {
                foundTargetPublicKey = true;
              }
              j++;
            }
            
            // Only add this peer section if it's NOT the one we want to remove
            if (!foundTargetPublicKey) {
              filteredLines.push(...peerSectionLines);
            } else {
              console.log(`Removing peer section with public key: ${client.publicKey.trim()}`);
            }
            
            // Move to the next section
            i = j;
          } else {
            // This is not a peer section, keep the line
            filteredLines.push(line);
            i++;
          }
        }

        // Clean up trailing empty lines
        while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === '') {
          filteredLines.pop();
        }

        // Ensure file ends with newline
        const finalContent = filteredLines.join('\n') + (filteredLines.length > 0 ? '\n' : '');
        await writeFile(configFile, finalContent);
        console.log(`Updated config file: removed peer with public key ${client.publicKey.trim()}`);
      }
    } catch (error) {
      console.error('Failed to update config file:', error);
      throw error;
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

  async validateWireGuardConfig(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      const configPath = this.configService.get('WIREGUARD_CONFIG_PATH', '/etc/wireguard');
      const configFile = path.join(configPath, `${interface$}.conf`);

      // Check if config file exists
      try {
        const content = await readFile(configFile, 'utf8');
        
        // Basic validation: check for interface section
        if (!content.includes('[Interface]')) {
          errors.push('Config file is missing [Interface] section');
        }

        // Check for private key in interface
        if (!content.includes('PrivateKey =')) {
          errors.push('Interface section is missing PrivateKey');
        }

        // Validate peer sections
        const peerSections = content.split('[Peer]').slice(1);
        for (let i = 0; i < peerSections.length; i++) {
          const peer = peerSections[i];
          if (!peer.includes('PublicKey =')) {
            errors.push(`Peer section ${i + 1} is missing PublicKey`);
          }
        }

        // Test if config can be parsed by WireGuard
        try {
          await execAsync(`wg-quick strip ${interface$}`);
        } catch (error) {
          errors.push(`WireGuard config validation failed: ${error.message}`);
        }

      } catch (error) {
        errors.push(`Cannot read config file: ${error.message}`);
      }

    } catch (error) {
      errors.push(`Config validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
