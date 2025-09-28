import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../entities/admin-user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    
    const admin = await this.adminUserRepository.findOne({
      where: [
        { username },
        { email: username }
      ]
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    admin.lastLogin = new Date();
    await this.adminUserRepository.save(admin);

    const payload = { 
      id: admin.id, 
      username: admin.username, 
      role: admin.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    };
  }

  async validateUser(payload: any): Promise<any> {
    const admin = await this.adminUserRepository.findOne({
      where: { id: payload.id, isActive: true }
    });
    
    if (!admin) {
      throw new UnauthorizedException();
    }
    
    return admin;
  }

  async createDefaultAdmin() {
    const existingAdmin = await this.adminUserRepository.count();
    if (existingAdmin === 0) {
      const hashedPassword = await bcrypt.hash('19951995Bh', 12);
      
      const defaultAdmin = this.adminUserRepository.create({
        username: 'hameed',
        email: 'hameed@vpn.local',
        password: hashedPassword,
        role: 'admin',
      });

      await this.adminUserRepository.save(defaultAdmin);
      console.log('Default admin user created: hameed/19951995Bh');
    }
  }
}
