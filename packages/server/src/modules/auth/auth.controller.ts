import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    try {
      const user = await this.authService.validateUser(dto.email, dto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return this.authService.login(user);
    } catch (error: any) {
      if (error.message === 'User is disabled') {
        throw new UnauthorizedException('Account is disabled');
      }
      throw error;
    }
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(dto);
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        throw new BadRequestException('Email already registered');
      }
      throw error;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      return this.authService.refreshToken(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const fullUser = await this.authService.getUserById(user.id);
    const sanitized = this.authService.sanitizeUser(fullUser);
    return {
      ...sanitized,
      permissions: user.permissions,
      roles: user.roles,
    };
  }
}
