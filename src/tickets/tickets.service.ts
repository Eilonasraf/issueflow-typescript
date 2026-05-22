import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findByProject(projectId: number): Promise<Ticket[]> {
    return this.ticketRepo.find({ where: { projectId } });
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new BadRequestException(`Project ${dto.projectId} does not exist`);
    }
    if (dto.assigneeId != null) {
      await this.assertAssigneeExists(dto.assigneeId);
    }
    return this.ticketRepo.save(this.ticketRepo.create(dto));
  }

  async update(id: number, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (dto.assigneeId != null) {
      await this.assertAssigneeExists(dto.assigneeId);
    }
    Object.assign(ticket, dto);
    return this.ticketRepo.save(ticket);
  }

  async remove(id: number): Promise<void> {
    const ticket = await this.findOne(id);
    await this.ticketRepo.softRemove(ticket);
  }

  private async assertAssigneeExists(assigneeId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: assigneeId } });
    if (!user) {
      throw new BadRequestException(`Assignee ${assigneeId} does not exist`);
    }
  }
}
