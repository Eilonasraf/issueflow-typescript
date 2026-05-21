import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_dependencies')
@Unique(['ticketId', 'blockedById'])
export class TicketDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'blocked_by_id' })
  blockedById: number;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'blocked_by_id' })
  blockedBy: Ticket;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
