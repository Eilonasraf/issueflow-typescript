import { TicketsService } from './tickets.service';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketType } from '../common/enums/ticket-type.enum';

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
  return { svc, ticketRepo, stateService };
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
