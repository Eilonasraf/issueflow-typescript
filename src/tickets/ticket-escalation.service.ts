import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

export interface EscalationSummary {
  processed: number;
  escalated: number;
  markedOverdue: number;
}

const NEXT_PRIORITY: Record<TicketPriority, TicketPriority> = {
  [TicketPriority.LOW]: TicketPriority.MEDIUM,
  [TicketPriority.MEDIUM]: TicketPriority.HIGH,
  [TicketPriority.HIGH]: TicketPriority.CRITICAL,
  [TicketPriority.CRITICAL]: TicketPriority.CRITICAL,
};

@Injectable()
export class TicketEscalationService {
  constructor(
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async runEscalation(now: Date = new Date()): Promise<EscalationSummary> {
    const candidates = await this.tickets.find({
      where: {
        dueDate: LessThan(now),
        status: Not(TicketStatus.DONE),
      },
    });
    let escalated = 0;
    let markedOverdue = 0;
    for (const ticket of candidates) {
      if (ticket.priority !== TicketPriority.CRITICAL) {
        ticket.priority = NEXT_PRIORITY[ticket.priority];
        await this.tickets.save(ticket);
        await this.audit(ticket.id);
        escalated++;
      } else if (!ticket.isOverdue) {
        ticket.isOverdue = true;
        await this.tickets.save(ticket);
        await this.audit(ticket.id);
        markedOverdue++;
      }
    }
    return { processed: candidates.length, escalated, markedOverdue };
  }

  private audit(ticketId: number): Promise<void> {
    return this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: ticketId,
      performedBy: null,
      actor: AuditActor.SYSTEM,
    });
  }
}
