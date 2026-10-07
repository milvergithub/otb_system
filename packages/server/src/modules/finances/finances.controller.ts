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
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { FinancesService, FinanceAccess } from './finances.service';
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

  /**
   * Builds the request's finance access context. `canViewAll` is the
   * `finances.all` permission (visibility only, never responsibility).
   */
  private buildAccess(
    user: AuthUser,
    params?: {
      scope?: FilterFinanceDto['scope'] | FinanceReportsFilterDto['scope'];
      responsibleUserId?: string;
      collectorUserId?: string;
      registeredByUserId?: string;
    },
  ): FinanceAccess {
    return {
      userId: user.id,
      canViewAll: user.permissions.includes('finances.all'),
      scope: params?.scope,
      responsibleUserId: params?.responsibleUserId,
      collectorUserId: params?.collectorUserId,
      registeredByUserId: params?.registeredByUserId,
    };
  }

  @Get()
  @Roles('finances.read')
  findAll(
    @Query() filter: FilterFinanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResult<FinanceTransaction>> {
    return this.financesService.findAll(filter, this.buildAccess(user, filter));
  }

  @Get('reports/summary')
  @Roles('finances.read')
  getSummary(
    @Query() filter: FinanceReportsFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.getSummary(
      filter.startDate,
      filter.endDate,
      this.buildAccess(user, filter),
    );
  }

  @Get('reports/by-category')
  @Roles('finances.read')
  getByCategory(
    @Query() filter: FinanceReportsFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.getByCategory(
      filter.startDate,
      filter.endDate,
      filter.type,
      this.buildAccess(user, filter),
    );
  }

  @Get('reports/by-method')
  @Roles('finances.read')
  getByPaymentMethod(
    @Query() filter: FinanceReportsFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.getByPaymentMethod(
      filter.startDate,
      filter.endDate,
      this.buildAccess(user, filter),
    );
  }

  @Get('reports/monthly')
  @Roles('finances.read')
  getMonthlySeries(
    @Query() filter: FinanceReportsFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.getMonthlySeries(
      filter.startDate,
      filter.endDate,
      this.buildAccess(user, filter),
    );
  }

  @Get('reports/water')
  @Roles('finances.read')
  getWaterReport(@Query() filter: FinanceReportsFilterDto) {
    // Water report aggregates payments/bills directly (not finance
    // movements), so it has no responsibility scoping.
    return this.financesService.getWaterReport(
      filter.startDate,
      filter.endDate,
    );
  }

  @Get('reports/export')
  @Roles('finances.export')
  async exportCsv(
    @Query() filter: FinanceReportsFilterDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const csv = await this.financesService.exportCsv(
      filter.startDate,
      filter.endDate,
      this.buildAccess(user, filter),
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="finances.csv"',
    });
    res.end(csv);
  }

  @Get(':id')
  @Roles('finances.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('details') details?: string,
  ) {
    return this.financesService.findOne(
      id,
      details === 'true',
      this.buildAccess(user),
    );
  }

  @Get(':id/documents')
  @Roles('finances.read')
  getDocuments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.financesService.getDocuments(id, this.buildAccess(user));
  }

  @Get(':id/documents/:documentId/content')
  @Roles('finances.read')
  async getDocumentContent(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { body, contentType } = await this.financesService.getDocumentContent(
      id,
      documentId,
      this.buildAccess(user),
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
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.createManual(dto, this.buildAccess(user));
  }

  @Patch(':id')
  @Roles('finances.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.update(id, dto, this.buildAccess(user));
  }

  @Post(':id/void')
  @Roles('finances.void')
  void(
    @Param('id') id: string,
    @Body() dto: VoidFinanceTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.void(id, dto, user.id, this.buildAccess(user));
  }

  @Post(':id/documents')
  @Roles('finances.create')
  addDocument(
    @Param('id') id: string,
    @Body() dto: AddFinanceDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.addDocument(
      id,
      dto,
      user.id,
      this.buildAccess(user),
    );
  }

  @Delete(':id/documents/:documentId')
  @Roles('finances.update')
  removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financesService.removeDocument(
      id,
      documentId,
      this.buildAccess(user),
    );
  }
}
