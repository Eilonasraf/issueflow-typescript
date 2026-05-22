import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { TicketDependency } from './ticket-dependency.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { TicketsService } from './tickets.service';
import { TicketStateService } from './ticket-state.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Project, User, TicketDependency]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketStateService],
})
export class TicketsModule {}
