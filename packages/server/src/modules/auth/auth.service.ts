import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';
import {
  ChangePasswordDto,
  CURRENT_PASSWORD_INVALID,
  PASSWORD_REUSED,
} from './dto/change-password.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
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

  /**
   * Self-service credential change, used both for the temporary password a
   * fresh account ships with and for later rotations.
   *
   * Tokens are reissued on success: the access token carries
   * `mustChangePassword`, so returning a fresh pair is what actually lifts the
   * forced-change block. Without it the caller would stay locked out until the
   * old token expired.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!currentValid) {
      throw new BadRequestException(CURRENT_PASSWORD_INVALID);
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(PASSWORD_REUSED);
    }

    await this.usersRepository.update(userId, {
      password_hash: await bcrypt.hash(dto.newPassword, 10),
      must_change_password: false,
    });

    const refreshed = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    const permissions = await this.rolesService.getUserPermissions(userId);
    const roleNames = (refreshed?.roles || []).map((r) => r.name);
    const tokens = await this.generateTokens(
      refreshed!,
      roleNames,
      permissions,
    );
    return {
      user: this.sanitizeUser(refreshed!),
      ...tokens,
    };
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
      mustChangePassword: user.must_change_password === true,
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
