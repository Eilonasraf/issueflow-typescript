import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

export interface CommentView {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  mentionedUsers: { id: number; username: string; fullName: string }[];
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findByTicket(ticketId: number): Promise<CommentView[]> {
    await this.getTicketOr404(ticketId);
    const comments = await this.commentRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
    return comments.map((comment) => this.toView(comment));
  }

  async create(
    ticketId: number,
    dto: CreateCommentDto,
    actorId: number,
  ): Promise<CommentView> {
    await this.getTicketOr404(ticketId);
    const author = await this.userRepo.findOne({ where: { id: dto.authorId } });
    if (!author) {
      throw new BadRequestException(`Author ${dto.authorId} does not exist`);
    }
    const saved = await this.commentRepo.save(
      this.commentRepo.create({
        ticketId,
        authorId: dto.authorId,
        content: dto.content,
      }),
    );
    await this.auditLogs.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.COMMENT,
      entityId: saved.id,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return this.toView(saved);
  }

  async update(
    ticketId: number,
    commentId: number,
    dto: UpdateCommentDto,
    actorId: number,
  ): Promise<void> {
    const comment = await this.getCommentOr404(ticketId, commentId);
    comment.content = dto.content;
    await this.commentRepo.save(comment);
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.COMMENT,
      entityId: commentId,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  async remove(
    ticketId: number,
    commentId: number,
    actorId: number,
  ): Promise<void> {
    const comment = await this.getCommentOr404(ticketId, commentId);
    await this.commentRepo.remove(comment);
    await this.auditLogs.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.COMMENT,
      entityId: commentId,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }

  private toView(comment: Comment): CommentView {
    return {
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.authorId,
      content: comment.content,
      // TODO(mentions slice): parse @username from content and return real mentionedUsers
      mentionedUsers: [],
    };
  }

  private async getTicketOr404(ticketId: number): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    return ticket;
  }

  private async getCommentOr404(
    ticketId: number,
    commentId: number,
  ): Promise<Comment> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, ticketId },
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
    return comment;
  }
}
