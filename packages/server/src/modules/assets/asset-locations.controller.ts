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
import { AssetLocationsService } from './asset-locations.service';
import {
  CreateAssetLocationDto,
  UpdateAssetLocationDto,
} from './dto/asset-location.dto';

@Controller('asset-locations')
export class AssetLocationsController {
  constructor(private readonly assetLocationsService: AssetLocationsService) {}

  @Get()
  @Roles('assets.read')
  findAll() {
    return this.assetLocationsService.findAll();
  }

  @Get(':id')
  @Roles('assets.read')
  findOne(@Param('id') id: string) {
    return this.assetLocationsService.findOne(id);
  }

  @Post()
  @Roles('assets.create')
  create(@Body() dto: CreateAssetLocationDto) {
    return this.assetLocationsService.create(dto);
  }

  @Patch(':id')
  @Roles('assets.update')
  update(@Param('id') id: string, @Body() dto: UpdateAssetLocationDto) {
    return this.assetLocationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('assets.delete')
  remove(@Param('id') id: string) {
    return this.assetLocationsService.remove(id);
  }
}
