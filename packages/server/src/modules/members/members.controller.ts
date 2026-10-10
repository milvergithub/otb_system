import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AppError } from '../../common/errors/app-error';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { MembersService } from './members.service';
import type { MemberListStatus } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('members.read')
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('memberTypeId') memberTypeId?: string,
    @Query('status') status?: MemberListStatus,
    @CurrentUser() user?: AuthUser,
  ) {
    if (status === 'deleted' || status === 'all') {
      const allowed = (user?.permissions ?? []).includes('members.delete');
      if (!allowed) {
        throw new AppError('INSUFFICIENT_PERMISSIONS');
      }
    }
    // Anything that is not an explicit deleted/all marker is treated as the
    // default active list, so arbitrary query values cannot clash with the
    // withDeleted flag inside the service.
    const normalized: MemberListStatus =
      status === 'deleted' || status === 'all' ? status : 'active';
    return this.membersService.findAll(
      pagination,
      search,
      memberTypeId,
      normalized,
    );
  }

  @Get('all')
  @Roles('members.read')
  findAllForSelect() {
    return this.membersService.findAllForSelect();
  }

  @Get(':id')
  @Roles('members.read')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @Roles('members.create')
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Patch(':id')
  @Roles('members.update')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('members.delete')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  @Patch(':id/restore')
  @Roles('members.delete')
  restore(@Param('id') id: string) {
    return this.membersService.restore(id);
  }
}
