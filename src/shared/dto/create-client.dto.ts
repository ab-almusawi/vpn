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
}
