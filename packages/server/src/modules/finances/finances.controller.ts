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
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { FinancesService } from './finances.service';
import {
  CreateFinanceTransactionDto,
  FilterFinanceDto,
  FinanceReportsFilterDto,
  UpdateFinanceTransactionDto,
  VoidFinanceTransactionDto,
} from './dto/finance-transaction.dto';
import { AddFinanceDocumentDto } from './dto/finance-document.dto';
import { FinanceTransaction } from './entities/finance-transaction.entity';

@Controller('finances')
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Get()
  @Roles('finances.read')
  findAll(
    @Query() filter: FilterFinanceDto,
  ): Promise<PaginatedResult<FinanceTransaction>> {
    return this.financesService.findAll(filter);
  }

  @Get('reports/summary')
  @Roles('finances.read')
  getSummary(@Query() filter: FinanceReportsFilterDto) {
    return this.financesService.getSummary(filter.startDate, filter.endDate);
  }

  @Get('reports/by-category')
  @Roles('finances.read')
  getByCategory(@Query() filter: FinanceReportsFilterDto) {
    return this.financesService.getByCategory(
      filter.startDate,
      filter.endDate,
      filter.type,
    );
  }

  @Get('reports/by-method')
  @Roles('finances.read')
  getByPaymentMethod(@Query() filter: FinanceReportsFilterDto) {
    return this.financesService.getByPaymentMethod(
      filter.startDate,
      filter.endDate,
    );
  }

  @Get('reports/monthly')
  @Roles('finances.read')
  getMonthlySeries(@Query() filter: FinanceReportsFilterDto) {
    return this.financesService.getMonthlySeries(
      filter.startDate,
      filter.endDate,
    );
  }

  @Get('reports/water')
  @Roles('finances.read')
  getWaterReport(@Query() filter: FinanceReportsFilterDto) {
    return this.financesService.getWaterReport(
      filter.startDate,
      filter.endDate,
    );
  }

  @Get('reports/export')
  @Roles('finances.export')
  async exportCsv(
    @Query() filter: FinanceReportsFilterDto,
    @Res() res: Response,
  ) {
    const csv = await this.financesService.exportCsv(
      filter.startDate,
      filter.endDate,
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="finances.csv"',
    });
    res.end(csv);
  }

  @Get(':id')
  @Roles('finances.read')
  findOne(@Param('id') id: string, @Query('details') details?: string) {
    return this.financesService.findOne(id, details === 'true');
  }

  @Get(':id/documents')
  @Roles('finances.read')
  getDocuments(@Param('id') id: string) {
    return this.financesService.getDocuments(id);
  }

  @Get(':id/documents/:documentId/content')
  @Roles('finances.read')
  async getDocumentContent(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.financesService.getDocumentContent(
      id,
      documentId,
    );
    res.set({
      'Content-Type': contentType ?? 'application/octet-stream',
      'Content-Disposition': 'inline',
    });
    body.pipe(res);
  }

  @Post()
  @Roles('finances.create')
  create(
    @Body() dto: CreateFinanceTransactionDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.financesService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('finances.update')
  update(@Param('id') id: string, @Body() dto: UpdateFinanceTransactionDto) {
    return this.financesService.update(id, dto);
  }

  @Post(':id/void')
  @Roles('finances.void')
  void(
    @Param('id') id: string,
    @Body() dto: VoidFinanceTransactionDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.financesService.void(id, dto, userId);
  }

  @Post(':id/documents')
  @Roles('finances.create')
  addDocument(
    @Param('id') id: string,
    @Body() dto: AddFinanceDocumentDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.financesService.addDocument(id, dto, userId);
  }

  @Delete(':id/documents/:documentId')
  @Roles('finances.update')
  removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.financesService.removeDocument(id, documentId);
  }
}
