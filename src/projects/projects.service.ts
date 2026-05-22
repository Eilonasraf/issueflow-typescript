import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Project } from './project.entity';
import { User } from '../users/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(): Promise<Project[]> {
    return this.projectRepo.find();
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async create(dto: CreateProjectDto, actorId: number): Promise<Project> {
    const owner = await this.userRepo.findOne({ where: { id: dto.ownerId } });
    if (!owner) {
      throw new BadRequestException(`Owner ${dto.ownerId} does not exist`);
    }
    const project = await this.projectRepo.save(this.projectRepo.create(dto));
    await this.auditLogs.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PROJECT,
      entityId: project.id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return project;
  }

  async update(
    id: number,
    dto: UpdateProjectDto,
    actorId: number,
  ): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    const saved = await this.projectRepo.save(project);
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return saved;
  }

  async remove(id: number, actorId: number): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepo.softRemove(project);
    await this.auditLogs.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  findDeleted(): Promise<Project[]> {
    return this.projectRepo.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
    });
  }

  async restore(id: number, actorId: number): Promise<void> {
    const project = await this.projectRepo.findOne({
      withDeleted: true,
      where: { id },
    });
    if (!project || !project.deletedAt) {
      throw new NotFoundException(`Deleted project ${id} not found`);
    }
    await this.projectRepo.restore(id);
    await this.auditLogs.record({
      action: AuditAction.RESTORE,
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }
}
