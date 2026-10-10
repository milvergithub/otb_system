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
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { FinanceAccess } from '../finances/finances.service';
import { FilterFinanceDto } from '../finances/dto/finance-transaction.dto';
import { ContributionPaymentStatus } from './entities/contribution-payment.entity';
import { Contribution } from './entities/contribution.entity';
import { ContributionObligation } from './entities/contribution-obligation.entity';
import { ContributionPayment } from './entities/contribution-payment.entity';
import { ContributionsService } from './contributions.service';
import { ContributionsReceiptService } from './contributions-receipt.service';
import {
  AddMembersDto,
  CancelContributionDto,
  CancelObligationDto,
  CreateContributionDto,
  ExonerateObligationDto,
  FilterContributionsDto,
  FilterObligationsDto,
  PayContributionDto,
  UpdateContributionDto,
  VoidContributionPaymentDto,
} from './dto/contribution.dto';

@Controller('contributions')
export class ContributionsController {
  constructor(
    private readonly service: ContributionsService,
    private readonly receiptService: ContributionsReceiptService,
  ) {}

  private canViewAll(user: AuthUser): boolean {
    return user.permissions.includes('contributions.all');
  }

  /** Finance visibility context (`finances.all` is visibility only). */
  private buildAccess(
    user: AuthUser,
    filter?: FilterFinanceDto,
  ): FinanceAccess {
    return {
      userId: user.id,
      canViewAll: user.permissions.includes('finances.all'),
      scope: filter?.scope,
      responsibleUserId: filter?.responsibleUserId,
      collectorUserId: filter?.collectorUserId,
      registeredByUserId: filter?.registeredByUserId,
    };
  }

  @Get()
  @Roles('contributions.read')
  findAll(
    @Query() filter: FilterContributionsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResult<Contribution>> {
    return this.service.findAll(filter, user.id, this.canViewAll(user), filter);
  }

  @Post()
  @Roles('contributions.create')
  create(
    @Body() dto: CreateContributionDto,
    @CurrentUser('id') userId: string,
  ): Promise<Contribution> {
    return this.service.create(dto, userId);
  }

  @Get(':id')
  @Roles('contributions.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Contribution> {
    return this.service.findOne(id, user.id, this.canViewAll(user));
  }

  @Patch(':id')
  @Roles('contributions.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContributionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Contribution> {
    return this.service.update(id, dto, user.id, this.canViewAll(user));
  }

  @Delete(':id')
  @Roles('contributions.delete')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.service.remove(id, user.id, this.canViewAll(user));
  }

  @Post(':id/activate')
  @Roles('contributions.activate')
  activate(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Contribution> {
    return this.service.activate(id, user.id, this.canViewAll(user));
  }

  @Post(':id/pause')
  @Roles('contributions.activate')
  pause(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Contribution> {
    return this.service.pause(id, user.id, this.canViewAll(user));
  }

  @Post(':id/complete')
  @Roles('contributions.complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Contribution> {
    return this.service.complete(id, user.id, this.canViewAll(user));
  }

  @Post(':id/cancel')
  @Roles('contributions.cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelContributionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Contribution> {
    return this.service.cancel(id, dto, user.id, this.canViewAll(user));
  }

  @Post(':id/members')
  @Roles('contributions.update')
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddMembersDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ added: number; skipped: number }> {
    return this.service.addMembers(id, dto, user.id, this.canViewAll(user));
  }

  @Get(':id/obligations')
  @Roles('contributions.read')
  listObligations(
    @Param('id') id: string,
    @Query() filter: FilterObligationsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResult<ContributionObligation>> {
    return this.service.listObligations(
      id,
      filter,
      user.id,
      this.canViewAll(user),
      filter,
    );
  }

  @Post(':id/obligations/:obligationId/exonerate')
  @Roles('contributions.exonerate')
  exonerate(
    @Param('id') id: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: ExonerateObligationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContributionObligation> {
    return this.service.exonerate(
      id,
      obligationId,
      dto,
      user.id,
      this.canViewAll(user),
    );
  }

  @Post(':id/obligations/:obligationId/cancel')
  @Roles('contributions.update')
  cancelObligation(
    @Param('id') id: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: CancelObligationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContributionObligation> {
    return this.service.cancelObligation(
      id,
      obligationId,
      dto,
      user.id,
      this.canViewAll(user),
    );
  }

  @Get(':id/summary')
  @Roles('contributions.read')
  getSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getSummary(id, user.id, this.canViewAll(user));
  }

  @Get(':id/finances')
  @Roles('contributions.read')
  listFinances(
    @Param('id') id: string,
    @Query() filter: FilterFinanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listFinances(
      id,
      filter,
      user.id,
      this.canViewAll(user),
      this.buildAccess(user, filter),
    );
  }

  @Get(':id/payments')
  @Roles('contributions.read')
  listPayments(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ContributionPaymentStatus,
  ): Promise<PaginatedResult<ContributionPayment>> {
    return this.service.listPayments(
      id,
      pagination,
      user.id,
      this.canViewAll(user),
      status,
    );
  }

  @Post(':id/payments')
  @Roles('contributions.collect')
  pay(
    @Param('id') id: string,
    @Body() dto: PayContributionDto,
    @CurrentUser('id') userId: string,
  ): Promise<ContributionPayment> {
    return this.service.pay(id, dto, userId);
  }

  @Post(':id/payments/:paymentId/void')
  @Roles('contributions.void')
  voidPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: VoidContributionPaymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContributionPayment> {
    return this.service.voidPayment(
      id,
      paymentId,
      dto,
      user.id,
      this.canViewAll(user),
    );
  }

  @Get(':id/documents')
  @Roles('contributions.read')
  listDocuments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.listDocuments(id, user.id, this.canViewAll(user));
  }

  /** Rendición de cuentas (PDF). */
  @Get(':id/receipt')
  @Roles('contributions.review')
  async receipt(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.receiptService.generateRendition(
      id,
      user.id,
      this.canViewAll(user),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="rendicion-${id}.pdf"`,
    });
    res.end(buffer);
  }

  /** Payment receipt (PDF). */
  @Get(':id/payments/:paymentId/receipt')
  @Roles('contributions.read')
  async paymentReceipt(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.receiptService.generatePaymentReceipt(
      id,
      paymentId,
      user.id,
      this.canViewAll(user),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="aporte-${paymentId}.pdf"`,
    });
    res.end(buffer);
  }
}
