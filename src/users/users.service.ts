import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PasswordService } from '../auth/password.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto, actorId: number | null): Promise<User> {
    if (await this.repo.findOne({ where: { username: dto.username } })) {
      throw new ConflictException('Username already exists');
    }
    if (await this.repo.findOne({ where: { email: dto.email } })) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.repo.save(
      this.repo.create({
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash: this.passwordService.hash(dto.password),
      }),
    );
    await this.auditLogs.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return user;
  }

  async update(id: number, dto: UpdateUserDto, actorId: number): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.USER,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return saved;
  }

  async remove(id: number, actorId: number): Promise<void> {
    const user = await this.findOne(id);
    await this.repo.remove(user);
    await this.auditLogs.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.USER,
      entityId: id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }
}
