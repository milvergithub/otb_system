import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rolesService: RolesService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) return null;
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) return null;
    if (!user.is_active) {
      throw new Error('User is disabled');
    }
    return user;
  }

  async login(user: User) {
    const permissions = await this.rolesService.getUserPermissions(user.id);
    const roleNames = (user.roles || []).map((r) => r.name);
    const tokens = await this.generateTokens(user, roleNames, permissions);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    if (!user.is_active) {
      throw new Error('User is disabled');
    }
    const permissions = await this.rolesService.getUserPermissions(userId);
    const roleNames = (user.roles || []).map((r) => r.name);
    return this.generateTokens(user, roleNames, permissions);
  }

  async getUserById(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    return user;
  }

  private async generateTokens(
    user: User,
    roles: string[],
    permissions: string[],
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      roles,
      permissions,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as never,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as never,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  sanitizeUser(user: User) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}
