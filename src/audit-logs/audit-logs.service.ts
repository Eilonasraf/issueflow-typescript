import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface RecordAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number;
  performedBy: number | null;
  actor: AuditActor;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.repo.save(this.repo.create(input));
  }

  findAll(filter: AuditLogQueryDto): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filter.entityType !== undefined) {
      where.entityType = filter.entityType;
    }
    if (filter.entityId !== undefined) {
      where.entityId = filter.entityId;
    }
    if (filter.action !== undefined) {
      where.action = filter.action;
    }
    if (filter.actor !== undefined) {
      where.actor = filter.actor;
    }
    return this.repo.find({ where, order: { id: 'DESC' } });
  }
}
