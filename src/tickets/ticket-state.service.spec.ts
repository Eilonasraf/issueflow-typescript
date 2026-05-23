import { BadRequestException } from '@nestjs/common';
import { TicketStateService } from './ticket-state.service';
import { TicketStatus } from '../common/enums/ticket-status.enum';

describe('TicketStateService', () => {
  describe('assertCanUpdate', () => {
    const svc = new TicketStateService(null as never);

    it('throws when ticket is DONE', () => {
      expect(() =>
        svc.assertCanUpdate({ status: TicketStatus.DONE } as never),
      ).toThrow(BadRequestException);
    });

    it('passes when ticket is not DONE', () => {
      expect(() =>
        svc.assertCanUpdate({ status: TicketStatus.IN_PROGRESS } as never),
      ).not.toThrow();
    });
  });

  describe('assertValidTransition', () => {
    const svc = new TicketStateService(null as never);

    it('allows the three forward steps', () => {
      expect(() =>
        svc.assertValidTransition(TicketStatus.TODO, TicketStatus.IN_PROGRESS),
      ).not.toThrow();
      expect(() =>
        svc.assertValidTransition(
          TicketStatus.IN_PROGRESS,
          TicketStatus.IN_REVIEW,
        ),
      ).not.toThrow();
      expect(() =>
        svc.assertValidTransition(TicketStatus.IN_REVIEW, TicketStatus.DONE),
      ).not.toThrow();
    });

    it('rejects forward jumps (TODO -> DONE)', () => {
      expect(() =>
        svc.assertValidTransition(TicketStatus.TODO, TicketStatus.DONE),
      ).toThrow(BadRequestException);
    });

    it('rejects backward transitions', () => {
      expect(() =>
        svc.assertValidTransition(TicketStatus.IN_PROGRESS, TicketStatus.TODO),
      ).toThrow(BadRequestException);
      expect(() =>
        svc.assertValidTransition(TicketStatus.DONE, TicketStatus.IN_REVIEW),
      ).toThrow(BadRequestException);
    });

    it('treats same-status as a no-op', () => {
      expect(() =>
        svc.assertValidTransition(TicketStatus.TODO, TicketStatus.TODO),
      ).not.toThrow();
    });
  });

  describe('assertNoOpenBlockers', () => {
    it('passes when there are no dependency rows', async () => {
      const repo = { find: jest.fn().mockResolvedValue([]) };
      const svc = new TicketStateService(repo as never);
      await expect(svc.assertNoOpenBlockers(1)).resolves.toBeUndefined();
      expect(repo.find).toHaveBeenCalledWith({
        where: { ticketId: 1 },
        relations: ['blockedBy'],
      });
    });

    it('passes when every blocker is DONE', async () => {
      const repo = {
        find: jest
          .fn()
          .mockResolvedValue([
            { blockedById: 9, blockedBy: { status: TicketStatus.DONE } },
          ]),
      };
      const svc = new TicketStateService(repo as never);
      await expect(svc.assertNoOpenBlockers(1)).resolves.toBeUndefined();
    });

    it('throws and names the open blockers', async () => {
      const repo = {
        find: jest.fn().mockResolvedValue([
          { blockedById: 7, blockedBy: { status: TicketStatus.IN_PROGRESS } },
          { blockedById: 8, blockedBy: { status: TicketStatus.DONE } },
        ]),
      };
      const svc = new TicketStateService(repo as never);
      await expect(svc.assertNoOpenBlockers(1)).rejects.toThrow(
        /blocked by unresolved tickets \[7\]/,
      );
    });
  });
});
