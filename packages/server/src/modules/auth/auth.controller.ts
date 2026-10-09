import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipPasswordChange } from '../../common/decorators/skip-password-change.decorator';
import { AuthUser } from './interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 10000, limit: 5 } })
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
  @SkipPasswordChange()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 10000, limit: 5 } })
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

  @SkipPasswordChange()
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

  /**
   * Deliberately left without a `@Public()` decorator and with no role
   * requirement: every authenticated account must be able to rotate its own
   * credential, including while the forced-change block is still active.
   *
   * Throttled with the global limit because this endpoint accepts a password
   * guess the same way `login` does.
   */
  @SkipPasswordChange()
  @UseGuards(ThrottlerGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
