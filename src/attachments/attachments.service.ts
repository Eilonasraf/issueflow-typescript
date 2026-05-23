import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fsp } from 'fs';
import { Attachment } from './attachment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';

export interface AttachmentView {
  id: number;
  ticketId: number;
  filename: string;
  contentType: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachments: Repository<Attachment>,
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async addAttachment(
    ticketId: number,
    file: Express.Multer.File,
    actorId: number,
  ): Promise<AttachmentView> {
    const ticket = await this.tickets.findOne({ where: { id: ticketId } });
    if (!ticket) {
      await fsp.unlink(file.path).catch(() => undefined);
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    let saved: Attachment;
    try {
      saved = await this.attachments.save(
        this.attachments.create({
          ticketId,
          filename: file.originalname,
          storagePath: file.path,
          contentType: file.mimetype,
          size: String(file.size),
        }),
      );
    } catch (err) {
      await fsp.unlink(file.path).catch(() => undefined);
      throw err;
    }
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: ticketId,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
    return {
      id: saved.id,
      ticketId: saved.ticketId,
      filename: saved.filename,
      contentType: saved.contentType,
    };
  }

  async removeAttachment(
    ticketId: number,
    attachmentId: number,
    actorId: number,
  ): Promise<void> {
    const attachment = await this.attachments.findOne({
      where: { id: attachmentId, ticketId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }
    await this.attachments.remove(attachment);
    await fsp.unlink(attachment.storagePath).catch(() => undefined);
    await this.auditLogs.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: ticketId,
      performedBy: actorId,
      actor: AuditActor.USER,
    });
  }
}
