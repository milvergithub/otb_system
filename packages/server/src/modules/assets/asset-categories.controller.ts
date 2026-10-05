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
import { AssetCategoriesService } from './asset-categories.service';
import {
  CreateAssetCategoryDto,
  UpdateAssetCategoryDto,
} from './dto/asset-category.dto';

@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(
    private readonly assetCategoriesService: AssetCategoriesService,
  ) {}

  @Get()
  @Roles('assets.read')
  findAll() {
    return this.assetCategoriesService.findAll();
  }

  @Get(':id')
  @Roles('assets.read')
  findOne(@Param('id') id: string) {
    return this.assetCategoriesService.findOne(id);
  }

  @Post()
  @Roles('assets.create')
  create(@Body() dto: CreateAssetCategoryDto) {
    return this.assetCategoriesService.create(dto);
  }

  @Patch(':id')
  @Roles('assets.update')
  update(@Param('id') id: string, @Body() dto: UpdateAssetCategoryDto) {
    return this.assetCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('assets.delete')
  remove(@Param('id') id: string) {
    return this.assetCategoriesService.remove(id);
  }
}
