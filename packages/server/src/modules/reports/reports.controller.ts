import { Controller, Get, Header, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('reports.dashboard')
  dashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDashboard(startDate, endDate);
  }

  @Get('revenue')
  @Roles('reports.revenue')
  revenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getMonthlyRevenue(startDate, endDate);
  }

  @Get('overdue')
  @Roles('reports.overdue')
  overdue() {
    return this.reportsService.getOverdueMembers();
  }

  @Get('export')
  @Roles('reports.export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="billing-report.csv"')
  async export(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.exportCsv(startDate, endDate);
  }
}
