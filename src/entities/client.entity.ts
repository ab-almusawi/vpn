import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('clients')
@Index(['deviceId'])
@Index(['realIp'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', unique: true })
  deviceId: string;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  @Column({ name: 'real_ip' })
  realIp: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'vpn_ip', unique: true })
  vpnIp: string;

  @Column({ name: 'public_key', unique: true })
  publicKey: string;

  @Column({ name: 'private_key' })
  privateKey: string;

  @Column({ name: 'preshared_key', nullable: true })
  presharedKey: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_handshake', type: 'timestamp', nullable: true })
  lastHandshake: Date;

  @Column({ name: 'bytes_sent', type: 'bigint', default: 0 })
  bytesSent: number;

  @Column({ name: 'bytes_received', type: 'bigint', default: 0 })
  bytesReceived: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
