import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AssignPermissionsDto,
  AssignUserRolesDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('roles.read')
  findAll() {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  @Roles('roles.read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findRoleById(id);
  }

  @Post()
  @Roles('roles.create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @Roles('roles.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @Roles('roles.delete')
  remove(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }

  @Put(':id/permissions')
  @Roles('roles.update')
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissionsToRole(id, dto.permissionIds);
  }

  @Get('permissions/all')
  @Roles('roles.read')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get('users/all')
  @Roles('users.read')
  findAllUsers() {
    return this.rolesService.findAllUsers();
  }

  @Get('users/:userId/roles')
  @Roles('users.read')
  getUserRoles(@Param('userId') userId: string) {
    return this.rolesService.getUserRoles(userId);
  }

  @Put('users/:userId/roles')
  @Roles('users.roles')
  assignRolesToUser(
    @Param('userId') userId: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.rolesService.assignRolesToUser(userId, dto.roleIds);
  }
}
