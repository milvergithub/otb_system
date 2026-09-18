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
import { CreateFineTypeDto, UpdateFineTypeDto } from './dto/fine-type.dto';
import { FineTypesService } from './fine-types.service';

@Controller('fine-types')
export class FineTypesController {
  constructor(private readonly service: FineTypesService) {}

  @Get()
  @Roles('activities.read')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('activities.create')
  create(@Body() dto: CreateFineTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('activities.update')
  update(@Param('id') id: string, @Body() dto: UpdateFineTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('activities.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
