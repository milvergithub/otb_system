import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { Setting } from './entities/setting.entity';
import { SeederService } from './seeder.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Setting, User, Role, Permission])],
  controllers: [SettingsController],
  providers: [SettingsService, SeederService],
  exports: [SettingsService, SeederService],
})
export class SettingsModule {}
