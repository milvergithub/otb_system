import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SettingsService } from '../settings/settings.service';
import { SeederService } from '../settings/seeder.service';
import { Setting } from '../settings/entities/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, Setting])],
  controllers: [UsersController],
  providers: [UsersService, SeederService, SettingsService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
