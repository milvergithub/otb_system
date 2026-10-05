import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { UploadAssetDocumentDto } from './dto/asset-document.dto';
import {
  CreateAssetDto,
  CreateAssetsBulkDto,
  ReportLostAssetDto,
  RestoreAssetDto,
  RetireAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';
import {
  LoanAssetDto,
  ReturnAssetDto,
  TransferAssetDto,
} from './dto/asset-movement.dto';
import {
  CreateAssetMaintenanceDto,
  FinishAssetMaintenanceDto,
} from './dto/asset-maintenance.dto';
import { FilterAssetDto } from './dto/filter-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Roles('assets.read')
  findAll(@Query() filter: FilterAssetDto) {
    return this.assetsService.findAll(filter);
  }

  @Get('select')
  @Roles('assets.read')
  findAllForSelect() {
    return this.assetsService.findAllForSelect();
  }

  @Get('status-summary')
  @Roles('assets.read')
  getStatusSummary() {
    return this.assetsService.getStatusSummary();
  }

  @Get('public/:code')
  @Public()
  findPublicByCode(@Param('code') code: string) {
    return this.assetsService.findPublicByCode(code);
  }

  @Post()
  @Roles('assets.create')
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Post('bulk')
  @Roles('assets.create')
  createBulk(@Body() dto: CreateAssetsBulkDto) {
    return this.assetsService.createBulk(dto);
  }

  @Get(':id')
  @Roles('assets.read')
  findOne(@Param('id') id: string, @Query('details') details?: string) {
    return this.assetsService.findOne(id, details === 'true');
  }

  @Get(':id/qr')
  @Roles('assets.read')
  getQrPayload(@Param('id') id: string) {
    return this.assetsService.getQrPayload(id);
  }

  @Get(':id/movements')
  @Roles('assets.read')
  listMovements(@Param('id') id: string) {
    return this.assetsService.listMovements(id);
  }

  @Get(':id/maintenances')
  @Roles('assets.read')
  listMaintenances(@Param('id') id: string) {
    return this.assetsService.listMaintenances(id);
  }

  @Get(':id/documents')
  @Roles('assets.read')
  listDocuments(@Param('id') id: string) {
    return this.assetsService.listDocuments(id);
  }

  @Get(':id/documents/:documentId/content')
  @Roles('assets.read')
  async getDocumentContent(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.assetsService.getDocumentContent(
      id,
      documentId,
    );

    res.set({
      'Content-Type': contentType ?? 'application/octet-stream',
      'Content-Disposition': 'inline',
    });
    body.pipe(res);
  }

  @Patch(':id')
  @Roles('assets.update')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('assets.delete')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }

  @Post(':id/loan')
  @Roles('assets.loan')
  loan(
    @Param('id') id: string,
    @Body() dto: LoanAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.loan(id, dto, userId);
  }

  @Post(':id/return')
  @Roles('assets.loan')
  returnAsset(@Param('id') id: string, @Body() dto: ReturnAssetDto) {
    return this.assetsService.returnAsset(id, dto);
  }

  @Post(':id/transfer')
  @Roles('assets.update')
  transfer(
    @Param('id') id: string,
    @Body() dto: TransferAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.transfer(id, dto, userId);
  }

  @Post(':id/lost')
  @Roles('assets.update')
  reportLost(
    @Param('id') id: string,
    @Body() dto: ReportLostAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.reportLost(id, dto, userId);
  }

  @Post(':id/retire')
  @Roles('assets.retire')
  retire(
    @Param('id') id: string,
    @Body() dto: RetireAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.retire(id, dto, userId);
  }

  @Post(':id/restore')
  @Roles('assets.retire')
  restore(
    @Param('id') id: string,
    @Body() dto: RestoreAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.restore(id, dto, userId);
  }

  @Post(':id/maintenance')
  @Roles('assets.maintenance')
  addMaintenance(
    @Param('id') id: string,
    @Body() dto: CreateAssetMaintenanceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.addMaintenance(id, dto, userId);
  }

  @Post(':id/maintenance/:maintenanceId/finish')
  @Roles('assets.maintenance')
  finishMaintenance(
    @Param('id') id: string,
    @Param('maintenanceId') maintenanceId: string,
    @Body() dto: FinishAssetMaintenanceDto,
  ) {
    return this.assetsService.finishMaintenance(id, maintenanceId, dto);
  }

  @Post(':id/documents')
  @Roles('assets.update')
  addDocument(
    @Param('id') id: string,
    @Body() dto: UploadAssetDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assetsService.addDocument(id, dto, userId);
  }

  @Delete(':id/documents/:documentId')
  @Roles('assets.update')
  removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.assetsService.removeDocument(id, documentId);
  }
}
