import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientDto {
  @ApiPropertyOptional({
    description: 'Human readable device name',
    example: 'John\'s Updated Phone',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Client status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
