import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketEscalationService } from './ticket-escalation.service';

@Injectable()
export class TicketEscalationScheduler {
  private readonly logger = new Logger(TicketEscalationScheduler.name);

  constructor(private readonly escalation: TicketEscalationService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    disabled: process.env.NODE_ENV === 'test',
  })
  async tick(): Promise<void> {
    try {
      const summary = await this.escalation.runEscalation();
      if (
        summary.processed > 0 ||
        summary.escalated > 0 ||
        summary.markedOverdue > 0
      ) {
        this.logger.log(
          `escalation cycle: processed=${summary.processed} escalated=${summary.escalated} markedOverdue=${summary.markedOverdue}`,
        );
      }
    } catch (err) {
      const e = err as Error;
      this.logger.error(`escalation cycle failed: ${e.message}`, e.stack);
    }
  }
}
