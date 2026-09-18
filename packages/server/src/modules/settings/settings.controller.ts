import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('settings.read')
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @Roles('settings.update')
  updateAll(@Body() values: Record<string, string>) {
    return this.settingsService.updateAll(values);
  }
}
