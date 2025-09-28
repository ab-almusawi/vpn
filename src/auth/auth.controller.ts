import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin user and return JWT token'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    example: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: 'uuid-here',
        username: 'admin',
        email: 'admin@vpn.local',
        role: 'admin',
        lastLogin: '2024-01-01T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials'
  })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin profile',
    description: 'Get current authenticated admin user profile'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized'
  })
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      lastLogin: req.user.lastLogin,
    };
  }
}
