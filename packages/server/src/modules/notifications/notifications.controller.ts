import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('notifications.read')
  findAll(@Query('memberId') memberId?: string) {
    return this.notificationsService.findAll(memberId);
  }

  @Get('unread-count')
  @Roles('notifications.read')
  unreadCount() {
    return this.notificationsService.unreadCount();
  }

  @Patch(':id/read')
  @Roles('notifications.update')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('mark-all')
  @Roles('notifications.update')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}
