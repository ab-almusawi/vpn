import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from '../entities/client.entity';
import { VpnModule } from '../vpn/vpn.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    VpnModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
