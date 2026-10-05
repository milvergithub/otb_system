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
import { FinanceCategoriesService } from './finance-categories.service';
import {
  CreateFinanceCategoryDto,
  UpdateFinanceCategoryDto,
} from './dto/finance-category.dto';

@Controller('finance-categories')
export class FinanceCategoriesController {
  constructor(private readonly categoriesService: FinanceCategoriesService) {}

  @Get()
  @Roles('finances.read')
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Roles('finances.read')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles('finances.create')
  create(@Body() dto: CreateFinanceCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Roles('finances.update')
  update(@Param('id') id: string, @Body() dto: UpdateFinanceCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('finances.update')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
