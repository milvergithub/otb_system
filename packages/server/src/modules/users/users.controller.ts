import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateUserDto,
  UpdateUserDto,
  ToggleUserActiveDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('users.read')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('users.read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('users.create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles('users.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @Roles('users.archive')
  toggleActive(@Param('id') id: string, @Body() dto: ToggleUserActiveDto) {
    return this.usersService.toggleActive(id, dto.isActive);
  }

  @Post(':id/regenerate-password')
  @Roles('users.update')
  regeneratePassword(@Param('id') id: string) {
    return this.usersService.regeneratePassword(id);
  }

  @Delete(':id')
  @Roles('users.delete')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
