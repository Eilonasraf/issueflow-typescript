import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLog } from './audit-log.entity';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto): Promise<AuditLog[]> {
    return this.auditLogsService.findAll(query);
  }
}
