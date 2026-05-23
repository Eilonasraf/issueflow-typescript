import { LessThan, Not } from 'typeorm';
import { TicketEscalationService } from './ticket-escalation.service';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

function build(
  candidates: {
    id: number;
    priority: TicketPriority;
    isOverdue: boolean;
    status?: TicketStatus;
  }[],
) {
  const tickets = {
    find: jest.fn().mockResolvedValue(candidates),
    save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
  };
  const auditLogs = { record: jest.fn().mockResolvedValue(undefined) };
  return {
    tickets,
    auditLogs,
    svc: new TicketEscalationService(tickets as never, auditLogs as never),
  };
}

describe('TicketEscalationService', () => {
  it('only queries tickets with dueDate < now and status != DONE (skips no-dueDate tickets via SQL NULL semantics)', async () => {
    const { svc, tickets } = build([]);
    const now = new Date('2026-05-23T12:00:00Z');

    await svc.runEscalation(now);

    expect(tickets.find).toHaveBeenCalledTimes(1);
    const call = tickets.find.mock.calls[0][0] as {
      where: { dueDate: unknown; status: unknown };
    };
    expect(call.where.dueDate).toEqual(LessThan(now));
    expect(call.where.status).toEqual(Not(TicketStatus.DONE));
  });

  it('bumps a non-CRITICAL priority and writes a SYSTEM/UPDATE audit row; does NOT touch status', async () => {
    const t = {
      id: 1,
      priority: TicketPriority.LOW,
      isOverdue: false,
      status: TicketStatus.IN_PROGRESS,
    };
    const { svc, tickets, auditLogs } = build([t]);

    const summary = await svc.runEscalation(new Date());

    expect(summary).toEqual({ processed: 1, escalated: 1, markedOverdue: 0 });
    expect(t.priority).toBe(TicketPriority.MEDIUM);
    expect(t.isOverdue).toBe(false);
    expect(t.status).toBe(TicketStatus.IN_PROGRESS);
    expect(tickets.save).toHaveBeenCalledTimes(1);
    expect(auditLogs.record).toHaveBeenCalledWith({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: 1,
      performedBy: null,
      actor: AuditActor.SYSTEM,
    });
  });

  it('flips is_overdue=true on a CRITICAL ticket and audits it; does NOT touch status', async () => {
    const t = {
      id: 2,
      priority: TicketPriority.CRITICAL,
      isOverdue: false,
      status: TicketStatus.IN_REVIEW,
    };
    const { svc, tickets, auditLogs } = build([t]);

    const summary = await svc.runEscalation(new Date());

    expect(summary).toEqual({ processed: 1, escalated: 0, markedOverdue: 1 });
    expect(t.isOverdue).toBe(true);
    expect(t.status).toBe(TicketStatus.IN_REVIEW);
    expect(tickets.save).toHaveBeenCalledTimes(1);
    expect(auditLogs.record).toHaveBeenCalledTimes(1);
  });

  it('is idempotent for CRITICAL + isOverdue=true (no save, no audit)', async () => {
    const t = { id: 3, priority: TicketPriority.CRITICAL, isOverdue: true };
    const { svc, tickets, auditLogs } = build([t]);

    const summary = await svc.runEscalation(new Date());

    expect(summary).toEqual({ processed: 1, escalated: 0, markedOverdue: 0 });
    expect(tickets.save).not.toHaveBeenCalled();
    expect(auditLogs.record).not.toHaveBeenCalled();
  });

  it('walks the full ladder LOW -> MEDIUM -> HIGH -> CRITICAL across cycles', async () => {
    const t = { id: 4, priority: TicketPriority.LOW, isOverdue: false };
    // Build a service whose find() always returns the same single ticket, so we can
    // run the loop multiple times to observe cumulative behavior.
    const tickets = {
      find: jest.fn().mockImplementation(() => Promise.resolve([t])),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
    };
    const auditLogs = { record: jest.fn().mockResolvedValue(undefined) };
    const svc = new TicketEscalationService(
      tickets as never,
      auditLogs as never,
    );

    await svc.runEscalation(new Date());
    expect(t.priority).toBe(TicketPriority.MEDIUM);
    await svc.runEscalation(new Date());
    expect(t.priority).toBe(TicketPriority.HIGH);
    await svc.runEscalation(new Date());
    expect(t.priority).toBe(TicketPriority.CRITICAL);
    expect(t.isOverdue).toBe(false);
    await svc.runEscalation(new Date());
    expect(t.priority).toBe(TicketPriority.CRITICAL);
    expect(t.isOverdue).toBe(true);

    const summary = await svc.runEscalation(new Date()); // fully settled
    expect(summary).toEqual({ processed: 1, escalated: 0, markedOverdue: 0 });
  });
});
