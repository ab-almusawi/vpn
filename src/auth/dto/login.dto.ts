import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username or email address',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  username: string;

  @ApiProperty({
    description: 'Password',
    example: 'admin123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 100)
  password: string;
}
