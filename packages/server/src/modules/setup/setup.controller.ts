import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CreateInitialAdminDto } from './dto/create-initial-admin.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  getStatus() {
    return this.setupService.getStatus();
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 10000, limit: 5 } })
  @Post('admin')
  createAdmin(@Body() dto: CreateInitialAdminDto) {
    return this.setupService.createInitialAdmin(dto);
  }
}
