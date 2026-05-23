import { TicketEscalationScheduler } from './ticket-escalation-scheduler.service';
import { TicketEscalationService } from './ticket-escalation.service';

function build(runResult: unknown) {
  const escalation = {
    runEscalation: jest
      .fn()
      .mockImplementation(() =>
        runResult instanceof Error
          ? Promise.reject(runResult)
          : Promise.resolve(runResult),
      ),
  };
  const scheduler = new TicketEscalationScheduler(
    escalation as unknown as TicketEscalationService,
  );
  return { scheduler, escalation };
}

describe('TicketEscalationScheduler', () => {
  it('calls TicketEscalationService.runEscalation() on tick', async () => {
    const { scheduler, escalation } = build({
      processed: 0,
      escalated: 0,
      markedOverdue: 0,
    });

    await scheduler.tick();

    expect(escalation.runEscalation).toHaveBeenCalledTimes(1);
  });

  it('does not throw when runEscalation() rejects (errors are caught and logged)', async () => {
    const { scheduler, escalation } = build(new Error('db down'));

    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(escalation.runEscalation).toHaveBeenCalledTimes(1);
  });
});
