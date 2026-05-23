import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  filename: string;

  @Column({ name: 'storage_path' })
  storagePath: string;

  @Column({ name: 'content_type' })
  contentType: string;

  @Column({ type: 'bigint' })
  size: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
