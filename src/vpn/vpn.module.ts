import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VpnController } from './vpn.controller';
import { VpnService } from './vpn.service';
import { WireguardService } from './wireguard.service';
import { GeolocationService } from './geolocation.service';
import { Client } from '../entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [VpnController],
  providers: [VpnService, WireguardService, GeolocationService],
  exports: [VpnService, WireguardService],
})
export class VpnModule {}
