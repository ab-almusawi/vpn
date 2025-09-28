import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async getHealthStatus() {
    const startTime = Date.now();
    
    const [dbStatus, wireguardStatus] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkWireguard(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      database: dbStatus.status === 'fulfilled' ? dbStatus.value : { status: 'error', error: dbStatus.reason?.message },
      wireguard: wireguardStatus.status === 'fulfilled' ? wireguardStatus.value : { status: 'error', error: wireguardStatus.reason?.message },
    };
  }

  private async checkDatabase() {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      return {
        status: 'connected',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private async checkWireguard() {
    try {
      const interface$ = this.configService.get('WIREGUARD_INTERFACE', 'wg0');
      
      const { stdout } = await execAsync(`wg show ${interface$}`);
      
      const lines = stdout.trim().split('\n');
      const clients = lines.filter(line => line.includes('peer ')).length;
      
      return {
        status: 'active',
        interface: interface$,
        clients,
      };
    } catch (error) {
      return {
        status: 'inactive',
        interface: this.configService.get('WIREGUARD_INTERFACE', 'wg0'),
        error: 'WireGuard not running or accessible',
      };
    }
  }
}
