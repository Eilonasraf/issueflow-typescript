import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { TicketDependency } from './ticket-dependency.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { TicketsService } from './tickets.service';
import { TicketStateService } from './ticket-state.service';
import { TicketDependenciesService } from './ticket-dependencies.service';
import { TicketAssignmentService } from './ticket-assignment.service';
import { TicketsController } from './tickets.controller';
import { TicketDependenciesController } from './ticket-dependencies.controller';
import { WorkloadController } from './workload.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Project, User, TicketDependency]),
    AuditLogsModule,
  ],
  controllers: [
    TicketsController,
    TicketDependenciesController,
    WorkloadController,
  ],
  providers: [
    TicketsService,
    TicketStateService,
    TicketDependenciesService,
    TicketAssignmentService,
  ],
})
export class TicketsModule {}
