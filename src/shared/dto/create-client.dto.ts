import { IsString, IsOptional, IsIP, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: 'device_12345_android',
  })
  @IsString()
  @Length(1, 100)
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Human readable device name',
    example: 'John\'s iPhone',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deviceName?: string;

  @ApiProperty({
    description: 'Client real IP address',
    example: '203.0.113.1',
  })
  @IsIP()
  realIp: string;

  @ApiPropertyOptional({
    description: 'Client WireGuard public key - Not required for /register endpoint (server generates keys)',
    example: 'kUzASNf+RCpmsVvWKG/qHcXKwaX3Nm18oBqccJB+7f8=',
  })
  @IsOptional()
  @IsString()
  @Length(44, 44, { message: 'WireGuard public key must be exactly 44 characters' })
  publicKey?: string;
}
