import { NotFoundException } from '@nestjs/common';
import { TicketAssignmentService } from './ticket-assignment.service';
import { UserRole } from '../common/enums/user-role.enum';

function build(deps: {
  ticketCounts?: Record<number, number>;
  developers?: { id: number; username: string }[];
  project?: { id: number } | null;
}) {
  const tickets = {
    count: jest
      .fn()
      .mockImplementation((opts: { where: { assigneeId: number } }) =>
        Promise.resolve(deps.ticketCounts?.[opts.where.assigneeId] ?? 0),
      ),
  };
  const users = {
    find: jest.fn().mockResolvedValue(
      (deps.developers ?? []).map((d) => ({
        ...d,
        role: UserRole.DEVELOPER,
      })),
    ),
  };
  const projects = {
    findOne: jest
      .fn()
      .mockResolvedValue(deps.project === undefined ? { id: 1 } : deps.project),
  };
  return {
    tickets,
    users,
    projects,
    svc: new TicketAssignmentService(
      tickets as never,
      users as never,
      projects as never,
    ),
  };
}

describe('TicketAssignmentService', () => {
  describe('autoAssign', () => {
    it('returns null when there are no developers', async () => {
      const { svc } = build({ developers: [] });
      expect(await svc.autoAssign(1)).toBeNull();
    });

    it('picks the least-loaded developer', async () => {
      const { svc } = build({
        developers: [
          { id: 10, username: 'a' },
          { id: 20, username: 'b' },
        ],
        ticketCounts: { 10: 5, 20: 1 },
      });
      expect(await svc.autoAssign(99)).toBe(20);
    });

    it('tie-breaks by user.id (lower id wins)', async () => {
      const { svc } = build({
        developers: [
          { id: 10, username: 'a' },
          { id: 20, username: 'b' },
        ],
        ticketCounts: { 10: 2, 20: 2 },
      });
      expect(await svc.autoAssign(99)).toBe(10);
    });
  });

  describe('workload', () => {
    it('throws NotFound when project does not exist', async () => {
      const { svc } = build({ project: null });
      await expect(svc.workload(99)).rejects.toThrow(NotFoundException);
    });

    it('returns all developers sorted by count ASC then id ASC', async () => {
      const { svc } = build({
        developers: [
          { id: 10, username: 'a' },
          { id: 20, username: 'b' },
          { id: 30, username: 'c' },
        ],
        ticketCounts: { 10: 3, 20: 1, 30: 3 },
      });
      expect(await svc.workload(1)).toEqual([
        { userId: 20, username: 'b', openTicketCount: 1 },
        { userId: 10, username: 'a', openTicketCount: 3 },
        { userId: 30, username: 'c', openTicketCount: 3 },
      ]);
    });

    it('returns developers with 0 count too', async () => {
      const { svc } = build({
        developers: [{ id: 10, username: 'a' }],
      });
      expect(await svc.workload(1)).toEqual([
        { userId: 10, username: 'a', openTicketCount: 0 },
      ]);
    });
  });
});
