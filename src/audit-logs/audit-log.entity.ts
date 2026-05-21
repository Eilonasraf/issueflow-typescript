import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { User } from '../users/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditEntityType, name: 'entity_type' })
  entityType: AuditEntityType;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: User | null;

  @Column({ type: 'enum', enum: AuditActor })
  actor: AuditActor;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
