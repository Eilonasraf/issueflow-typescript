import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketDependency } from './ticket-dependency.entity';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

export interface BlockerView {
  id: number;
  title: string;
  status: TicketStatus;
}

@Injectable()
export class TicketDependenciesService {
  constructor(
    @InjectRepository(TicketDependency)
    private readonly depRepo: Repository<TicketDependency>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async addDependency(
    ticketId: number,
    blockedById: number,
    actorId: number,
  ): Promise<void> {
    if (ticketId === blockedById) {
      throw new BadRequestException('A ticket cannot depend on itself');
    }
    const ticket = await this.getTicketOr404(ticketId);
    const blocker = await this.ticketRepo.findOne({
      where: { id: blockedById },
    });
    if (!blocker) {
      throw new BadRequestException(`Ticket ${blockedById} does not exist`);
    }
    if (ticket.projectId !== blocker.projectId) {
      throw new BadRequestException(
        'Both tickets must belong to the same project',
      );
    }
    const existing = await this.depRepo.findOne({
      where: { ticketId, blockedById },
    });
    if (existing) {
      throw new ConflictException('Dependency already exists');
    }
    await this.depRepo.save(this.depRepo.create({ ticketId, blockedById }));
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: ticketId,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  async listDependencies(ticketId: number): Promise<BlockerView[]> {
    await this.getTicketOr404(ticketId);
    const deps = await this.depRepo.find({
      where: { ticketId },
      relations: ['blockedBy'],
    });
    return deps
      .filter((dep) => dep.blockedBy)
      .map((dep) => ({
        id: dep.blockedBy.id,
        title: dep.blockedBy.title,
        status: dep.blockedBy.status,
      }));
  }

  async removeDependency(
    ticketId: number,
    blockerId: number,
    actorId: number,
  ): Promise<void> {
    await this.getTicketOr404(ticketId);
    const dep = await this.depRepo.findOne({
      where: { ticketId, blockedById: blockerId },
    });
    if (!dep) {
      throw new NotFoundException('Dependency not found');
    }
    await this.depRepo.remove(dep);
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: ticketId,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  private async getTicketOr404(id: number): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }
}
