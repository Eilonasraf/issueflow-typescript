import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { Ticket } from './ticket.entity';
import { TicketDependency } from './ticket-dependency.entity';

const FORWARD: Record<TicketStatus, TicketStatus | null> = {
  [TicketStatus.TODO]: TicketStatus.IN_PROGRESS,
  [TicketStatus.IN_PROGRESS]: TicketStatus.IN_REVIEW,
  [TicketStatus.IN_REVIEW]: TicketStatus.DONE,
  [TicketStatus.DONE]: null,
};

@Injectable()
export class TicketStateService {
  constructor(
    @InjectRepository(TicketDependency)
    private readonly depRepo: Repository<TicketDependency>,
  ) {}

  assertCanUpdate(ticket: Ticket): void {
    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException(
        'Cannot update a ticket that is already DONE',
      );
    }
  }

  assertValidTransition(current: TicketStatus, next: TicketStatus): void {
    if (current === next) {
      return;
    }
    if (FORWARD[current] !== next) {
      throw new BadRequestException(
        `Invalid status transition: ${current} -> ${next}`,
      );
    }
  }

  async assertNoOpenBlockers(ticketId: number): Promise<void> {
    const deps = await this.depRepo.find({
      where: { ticketId },
      relations: ['blockedBy'],
    });
    const openBlockers = deps
      .filter((dep) => dep.blockedBy && dep.blockedBy.status !== TicketStatus.DONE)
      .map((dep) => dep.blockedById);
    if (openBlockers.length > 0) {
      throw new BadRequestException(
        `Cannot move ticket to DONE: blocked by unresolved tickets [${openBlockers.join(', ')}]`,
      );
    }
  }
}
