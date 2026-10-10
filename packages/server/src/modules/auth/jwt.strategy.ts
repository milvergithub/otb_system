import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from './interfaces/auth-user.interface';
import { JwtPayload } from './auth.service';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub) {
      throw new AppError('INVALID_TOKEN');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      mustChangePassword: payload.mustChangePassword === true,
    };
  }
}
