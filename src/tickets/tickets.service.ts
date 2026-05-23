import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStateService } from './ticket-state.service';
import { TicketAssignmentService } from './ticket-assignment.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly stateService: TicketStateService,
    private readonly auditLogs: AuditLogsService,
    private readonly assignment: TicketAssignmentService,
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

  async create(dto: CreateTicketDto, actorId: number): Promise<Ticket> {
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new BadRequestException(`Project ${dto.projectId} does not exist`);
    }
    if (dto.assigneeId != null) {
      await this.assertAssigneeExists(dto.assigneeId);
    }
    const requestedAssignee = dto.assigneeId ?? null;
    const effectiveAssignee =
      requestedAssignee ?? (await this.assignment.autoAssign(dto.projectId));
    const autoAssigned =
      requestedAssignee == null && effectiveAssignee != null;
    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        ...dto,
        assigneeId: effectiveAssignee ?? undefined,
      }),
    );
    await this.auditLogs.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.TICKET,
      entityId: ticket.id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    if (autoAssigned) {
      await this.auditLogs.record({
        action: AuditAction.AUTO_ASSIGN,
        entityType: AuditEntityType.TICKET,
        entityId: ticket.id,
        performedBy: null,
        actor: AuditActor.SYSTEM,
      });
    }
    return ticket;
  }

  async update(
    id: number,
    dto: UpdateTicketDto,
    actorId: number,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id);
    this.stateService.assertCanUpdate(ticket);
    if (dto.assigneeId != null) {
      await this.assertAssigneeExists(dto.assigneeId);
    }
    if (dto.status != null && dto.status !== ticket.status) {
      this.stateService.assertValidTransition(ticket.status, dto.status);
      if (dto.status === TicketStatus.DONE) {
        await this.stateService.assertNoOpenBlockers(id);
      }
    }
    if (dto.priority != null && dto.priority !== ticket.priority) {
      ticket.isOverdue = false;
    }
    Object.assign(ticket, dto);
    const saved = await this.ticketRepo.save(ticket);
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return saved;
  }

  async remove(id: number, actorId: number): Promise<void> {
    const ticket = await this.findOne(id);
    await this.ticketRepo.softRemove(ticket);
    await this.auditLogs.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.TICKET,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  findDeleted(projectId: number): Promise<Ticket[]> {
    return this.ticketRepo.find({
      withDeleted: true,
      where: { projectId, deletedAt: Not(IsNull()) },
    });
  }

  async restore(id: number, actorId: number): Promise<void> {
    const ticket = await this.ticketRepo.findOne({
      withDeleted: true,
      where: { id },
    });
    if (!ticket || !ticket.deletedAt) {
      throw new NotFoundException(`Deleted ticket ${id} not found`);
    }
    await this.ticketRepo.restore(id);
    await this.auditLogs.record({
      action: AuditAction.RESTORE,
      entityType: AuditEntityType.TICKET,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  private async assertAssigneeExists(assigneeId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: assigneeId } });
    if (!user) {
      throw new BadRequestException(`Assignee ${assigneeId} does not exist`);
    }
    if (user.role !== UserRole.DEVELOPER) {
      throw new BadRequestException(
        `Assignee ${assigneeId} must have role DEVELOPER`,
      );
    }
  }
}
