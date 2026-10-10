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
import {
  CreateMemberTypeDto,
  UpdateMemberTypeDto,
  UpdateMemberTypeStatusDto,
} from './dto/member-type.dto';
import { MemberTypesService } from './member-types.service';

@Controller('member-types')
export class MemberTypesController {
  constructor(private readonly memberTypesService: MemberTypesService) {}

  @Get()
  @Roles('memberTypes.read')
  findAll(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.memberTypesService.findAll(
      search,
      includeInactive === 'true' || includeInactive === '1',
    );
  }

  @Get(':id')
  @Roles('memberTypes.read')
  findOne(@Param('id') id: string) {
    return this.memberTypesService.findOne(id);
  }

  @Post()
  @Roles('memberTypes.create')
  create(@Body() dto: CreateMemberTypeDto) {
    return this.memberTypesService.create(dto);
  }

  @Patch(':id')
  @Roles('memberTypes.update')
  update(@Param('id') id: string, @Body() dto: UpdateMemberTypeDto) {
    return this.memberTypesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('memberTypes.update')
  setStatus(@Param('id') id: string, @Body() dto: UpdateMemberTypeStatusDto) {
    return this.memberTypesService.setStatus(id, dto.isActive);
  }

  @Delete(':id')
  @Roles('memberTypes.delete')
  remove(@Param('id') id: string) {
    return this.memberTypesService.remove(id);
  }
}
