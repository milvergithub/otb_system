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
  CreateWaterShareDto,
  UpdateWaterShareDto,
} from './dto/water-share.dto';
import { SharesService } from './shares.service';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.sharesService.findAll(includeInactive === 'true');
  }

  @Get('active')
  findActive() {
    return this.sharesService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sharesService.findOne(id);
  }

  @Post()
  @Roles('shares.create')
  create(@Body() dto: CreateWaterShareDto) {
    return this.sharesService.create(dto);
  }

  @Patch(':id')
  @Roles('shares.update')
  update(@Param('id') id: string, @Body() dto: UpdateWaterShareDto) {
    return this.sharesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('shares.delete')
  deactivate(@Param('id') id: string) {
    return this.sharesService.deactivate(id);
  }
}
