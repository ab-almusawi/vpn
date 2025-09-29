import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVpnClientDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: 'unique-device-identifier',
  })
  @IsString()
  @Length(1, 100)
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Human readable device name',
    example: 'Samsung Galaxy S21',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Client real IP address (automatically extracted from request headers if not provided)',
    example: '203.123.45.67',
  })
  @IsOptional()
  @IsString()
  realIp?: string;
}
