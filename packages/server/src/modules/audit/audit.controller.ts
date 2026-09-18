import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { FilterAuditDto } from './dto/filter-audit.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('audit.read')
  findAll(@Query() filter: FilterAuditDto) {
    return this.auditService.findAll(filter);
  }

  @Get('export')
  @Roles('audit.read')
  async export(@Query() filter: FilterAuditDto, @Res() res: Response) {
    const csv = await this.auditService.exportToCsv({
      entity: filter.entity,
      action: filter.action,
      userId: filter.userId,
      entityId: filter.entityId,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
    });

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs.csv"`,
    });
    res.end(csv);
  }
}
