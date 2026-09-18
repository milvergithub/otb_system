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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('members.read')
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.membersService.findAll(pagination, search);
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
}
