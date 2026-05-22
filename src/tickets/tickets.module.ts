import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Project, User])],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
