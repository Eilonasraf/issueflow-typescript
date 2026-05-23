import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface WorkloadRow {
  userId: number;
  username: string;
  openTicketCount: number;
}

@Injectable()
export class TicketAssignmentService {
  constructor(
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
  ) {}

  async autoAssign(projectId: number): Promise<number | null> {
    const devs = await this.users.find({
      where: { role: UserRole.DEVELOPER },
      order: { id: 'ASC' },
    });
    if (devs.length === 0) {
      return null;
    }
    const counts = await Promise.all(
      devs.map((dev) => this.openTicketCount(projectId, dev.id)),
    );
    let bestIdx = 0;
    for (let i = 1; i < devs.length; i++) {
      if (counts[i] < counts[bestIdx]) {
        bestIdx = i;
      }
    }
    return devs[bestIdx].id;
  }

  async workload(projectId: number): Promise<WorkloadRow[]> {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const devs = await this.users.find({
      where: { role: UserRole.DEVELOPER },
      order: { id: 'ASC' },
    });
    const rows: WorkloadRow[] = await Promise.all(
      devs.map(async (dev) => ({
        userId: dev.id,
        username: dev.username,
        openTicketCount: await this.openTicketCount(projectId, dev.id),
      })),
    );
    rows.sort(
      (a, b) =>
        a.openTicketCount - b.openTicketCount || a.userId - b.userId,
    );
    return rows;
  }

  private openTicketCount(projectId: number, userId: number): Promise<number> {
    return this.tickets.count({
      where: {
        projectId,
        assigneeId: userId,
        status: Not(TicketStatus.DONE),
      },
    });
  }
}
