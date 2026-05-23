import { NotFoundException } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { TicketsService } from './tickets.service';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketType } from '../common/enums/ticket-type.enum';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

interface TicketRow {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  projectId: number;
  assigneeId: number | null;
  dueDate: Date | null;
  isOverdue: boolean;
  version: number;
  deletedAt: Date | null;
}

function buildSvc(existing: Partial<TicketRow>) {
  const row: TicketRow = {
    id: 42,
    title: 't',
    description: null,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    type: TicketType.BUG,
    projectId: 1,
    assigneeId: null,
    dueDate: null,
    isOverdue: true,
    version: 1,
    deletedAt: null,
    ...existing,
  };
  const ticketRepo = {
    findOne: jest.fn().mockResolvedValue(row),
    save: jest.fn().mockImplementation((t: TicketRow) => Promise.resolve(t)),
    softRemove: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    restore: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
  };
  const projectRepo = { findOne: jest.fn() };
  const userRepo = { findOne: jest.fn() };
  const stateService = {
    assertCanUpdate: jest.fn(),
    assertValidTransition: jest.fn(),
    assertNoOpenBlockers: jest.fn().mockResolvedValue(undefined),
  };
  const auditLogs = { record: jest.fn().mockResolvedValue(undefined) };
  const assignment = { autoAssign: jest.fn() };

  const svc = new TicketsService(
    ticketRepo as never,
    projectRepo as never,
    userRepo as never,
    stateService as never,
    auditLogs as never,
    assignment as never,
  );
  return { svc, ticketRepo, stateService, auditLogs };
}

describe('TicketsService.update — manual priority reset of is_overdue', () => {
  it('clears isOverdue when the client changes priority via PATCH', async () => {
    const { svc, ticketRepo } = buildSvc({
      priority: TicketPriority.HIGH,
      isOverdue: true,
    });

    await svc.update(42, { version: 1, priority: TicketPriority.MEDIUM }, 99);

    expect(ticketRepo.save).toHaveBeenCalledTimes(1);
    const saved = ticketRepo.save.mock.calls[0][0] as TicketRow;
    expect(saved.priority).toBe(TicketPriority.MEDIUM);
    expect(saved.isOverdue).toBe(false);
  });

  it('leaves isOverdue alone when priority is unchanged (only title edited)', async () => {
    const { svc, ticketRepo } = buildSvc({
      priority: TicketPriority.HIGH,
      isOverdue: true,
    });

    await svc.update(42, { version: 1, title: 'renamed' }, 99);

    const saved = ticketRepo.save.mock.calls[0][0] as TicketRow;
    expect(saved.isOverdue).toBe(true);
    expect(saved.priority).toBe(TicketPriority.HIGH);
  });

  it('leaves isOverdue alone when PATCH sends the SAME priority value', async () => {
    const { svc, ticketRepo } = buildSvc({
      priority: TicketPriority.HIGH,
      isOverdue: true,
    });

    await svc.update(42, { version: 1, priority: TicketPriority.HIGH }, 99);

    const saved = ticketRepo.save.mock.calls[0][0] as TicketRow;
    expect(saved.isOverdue).toBe(true);
  });
});

describe('TicketsService — soft delete (§3.5)', () => {
  it('remove() calls softRemove (not remove) and writes a DELETE audit row', async () => {
    const { svc, ticketRepo, auditLogs } = buildSvc({});

    await svc.remove(42, 99);

    expect(ticketRepo.softRemove).toHaveBeenCalledTimes(1);
    expect(ticketRepo.softRemove.mock.calls[0][0]).toMatchObject({ id: 42 });
    expect(ticketRepo.remove).not.toHaveBeenCalled();
    expect(auditLogs.record).toHaveBeenCalledWith({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.TICKET,
      entityId: 42,
      performedBy: 99,
      actor: AuditActor.USER,
    });
  });

  it('findDeleted(projectId) queries withDeleted: true and deletedAt: Not(IsNull())', async () => {
    const { svc, ticketRepo } = buildSvc({});

    await svc.findDeleted(7);

    expect(ticketRepo.find).toHaveBeenCalledTimes(1);
    expect(ticketRepo.find).toHaveBeenCalledWith({
      withDeleted: true,
      where: { projectId: 7, deletedAt: Not(IsNull()) },
    });
  });

  it('restore() calls repo.restore(id) and writes a RESTORE audit row', async () => {
    const { svc, ticketRepo, auditLogs } = buildSvc({
      deletedAt: new Date('2026-01-01T00:00:00Z'),
    });

    await svc.restore(42, 99);

    expect(ticketRepo.restore).toHaveBeenCalledWith(42);
    expect(auditLogs.record).toHaveBeenCalledWith({
      action: AuditAction.RESTORE,
      entityType: AuditEntityType.TICKET,
      entityId: 42,
      performedBy: 99,
      actor: AuditActor.USER,
    });
  });

  it('restore() throws NotFoundException when the ticket exists but is NOT soft-deleted', async () => {
    const { svc } = buildSvc({ deletedAt: null });

    await expect(svc.restore(42, 99)).rejects.toThrow(NotFoundException);
    await expect(svc.restore(42, 99)).rejects.toThrow(
      /Deleted ticket 42 not found/,
    );
  });

  it('restore() throws NotFoundException when the ticket does not exist at all', async () => {
    const { svc, ticketRepo } = buildSvc({});
    ticketRepo.findOne.mockResolvedValue(null);

    await expect(svc.restore(42, 99)).rejects.toThrow(NotFoundException);
  });
});
