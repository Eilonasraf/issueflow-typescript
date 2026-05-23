import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { Ticket } from './ticket.entity';
import { Project } from '../projects/project.entity';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

const EXPORT_COLUMNS = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'type',
  'assigneeId',
] as const;

export interface ImportSummary {
  created: number;
  failed: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class TicketCsvService {
  constructor(
    @InjectRepository(Ticket)
    private readonly tickets: Repository<Ticket>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly ticketsService: TicketsService,
  ) {}

  async exportTickets(projectId: number): Promise<string> {
    await this.assertProjectExists(projectId);
    const rows = await this.tickets.find({ where: { projectId } });
    const records = rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      status: t.status,
      priority: t.priority,
      type: t.type,
      assigneeId: t.assigneeId ?? '',
    }));
    return stringify(records, {
      header: true,
      columns: EXPORT_COLUMNS as unknown as string[],
    });
  }

  async importTickets(
    buffer: Buffer,
    projectId: number,
    actorId: number,
  ): Promise<ImportSummary> {
    await this.assertProjectExists(projectId);
    let rows: Record<string, string>[];
    try {
      rows = parse(buffer, {
        columns: true,
        trim: true,
        skip_empty_lines: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Invalid CSV: ${err?.message ?? 'parse error'}`);
    }
    let created = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const lineNumber = i + 2; // +1 header row, +1 to make it 1-based
      const r = rows[i];
      const assigneeRaw = r.assigneeId ?? '';
      const payload: Record<string, unknown> = {
        title: r.title,
        description: r.description || undefined,
        status: r.status || undefined,
        priority: r.priority,
        type: r.type,
        projectId,
        assigneeId: assigneeRaw === '' ? undefined : Number(assigneeRaw),
        dueDate: r.dueDate || undefined,
      };
      try {
        const dto = plainToInstance(CreateTicketDto, payload);
        const validationErrors = await validate(dto, { whitelist: true });
        if (validationErrors.length > 0) {
          failed++;
          errors.push({
            row: lineNumber,
            message: this.flattenValidationErrors(validationErrors),
          });
          continue;
        }
        await this.ticketsService.create(dto, actorId);
        created++;
      } catch (err: any) {
        failed++;
        errors.push({
          row: lineNumber,
          message: err?.message ?? 'Unknown error',
        });
      }
    }
    return { created, failed, errors };
  }

  private async assertProjectExists(projectId: number): Promise<void> {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) {
      throw new BadRequestException(`Project ${projectId} does not exist`);
    }
  }

  private flattenValidationErrors(
    errors: import('class-validator').ValidationError[],
  ): string {
    return errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('; ');
  }
}
